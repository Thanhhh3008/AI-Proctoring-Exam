import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { FaPlay, FaExclamationTriangle, FaDesktop, FaClock, FaSpinner, FaCheckCircle, FaListOl, FaInfoCircle } from 'react-icons/fa';
import './StudentExamRoom.css';

// ===================== PROCTORING IMPORTS =====================
import { ProctoringEngine } from '../../proctoring/ProctoringEngine';
import type { ProctoringStatus, ViolationEvent } from '../../proctoring/types';
import ReferencePhotoCapture from './ReferencePhotoCapture';
import ProctoringOverlay from './ProctoringOverlay';

export default function StudentExamRoom() {
  const { examId } = useParams();
  const navigate = useNavigate();

  // States
  const [examInfo, setExamInfo] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState<string>('Sinh viên');

  // Trạng thái
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFinishedRef = useRef(false); // Cờ đánh dấu đã nộp bài xong

  // Trạng thái Strict Mode
  const [violationLogs, setViolationLogs] = useState<string[]>([]);
  const [isWarningFullscreen, setIsWarningFullscreen] = useState(false);

  // ===================== PROCTORING STATES =====================
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [captureErrorMsg, setCaptureErrorMsg] = useState('');
  const [proctoringStatus, setProctoringStatus] = useState<ProctoringStatus>({
    isActive: false, faceDetected: false, faceCount: 0,
    identityVerified: true, headPose: { yaw: 0, pitch: 0, roll: 0 },
    phoneDetected: false, isStaticImage: false, violations: [],
  });
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [proctoringLoading, setProctoringLoading] = useState(false);
  const proctoringEngineRef = useRef<ProctoringEngine | null>(null);
  const proctoringVideoRef = useRef<HTMLVideoElement | null>(null);

  // ========================================================
  // CUSTOM MODAL (THAY THẾ WINDOW.CONFIRM KHI NỘP BÀI)
  // ========================================================
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const showModal = (type: 'alert' | 'confirm', title: string, message: string, onConfirm?: () => void) => {
    setModalConfig({ isOpen: true, type, title, message, onConfirm });
  };
  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

  // ========================================================
  // 1. LẤY THÔNG TIN LOBBY & THÔNG TIN USER (TÊN)
  // ========================================================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        try {
          const resUser = await axiosClient.get('/users/me');
          if (resUser.data && resUser.data.fullName) {
            setStudentName(resUser.data.fullName);
          } else if (resUser.data && resUser.data.name) {
            setStudentName(resUser.data.name);
          }
        } catch (e) {
          console.warn("Không lấy được tên sinh viên", e);
        }

        const resExam = await axiosClient.get(`/exams/${examId}`);
        setExamInfo(resExam.data);

      } catch (error: any) {
        alert("Không thể tải thông tin kỳ thi.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [examId, navigate]);

  // ========================================================
  // 2. LOGIC BẮT SỰ KIỆN STRICT MODE
  // ========================================================
  useEffect(() => {
    if (!isStarted || !examInfo?.strictMode) return;

    const handleVisibilityChange = () => {
      // Chỉ cảnh báo nếu chưa nộp bài
      if (document.hidden && !isFinishedRef.current) {
        // Ghi nhận vi phạm vào AI Engine để báo về server/giáo viên
        proctoringEngineRef.current?.emitViolation('TAB_SWITCH');
        alert("CẢNH BÁO: Bạn vừa rời khỏi màn hình bài thi. Hành vi đã được ghi lại!");
      }
    };

    const handleFullscreenChange = () => {
      // Chỉ hiện màn hình đỏ nếu chưa nộp bài
      if (!document.fullscreenElement && !isFinishedRef.current) {
        setIsWarningFullscreen(true);
        // Ghi nhận vi phạm vào AI Engine
        proctoringEngineRef.current?.emitViolation('FULLSCREEN_EXITED');
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }
  }, [isStarted, examInfo]);

  // ========================================================
  // 3. LOGIC ĐẾM NGƯỢC THỜI GIAN
  // ========================================================
  useEffect(() => {
    if (!isStarted || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          executeSubmit(true); // Tự nộp khi hết giờ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isStarted, timeLeft]);

  // ========================================================
  // PROCTORING: Khởi tạo AI Engine
  // ========================================================
  const initProctoring = async () => {
    setProctoringLoading(true);
    try {
      const engine = new ProctoringEngine();
      proctoringEngineRef.current = engine;
      engine.onStatusUpdate = (status) => setProctoringStatus(status);
      engine.onViolation = (v: ViolationEvent) => {
        setViolationLogs(prev => [...prev, `[${new Date(v.timestamp).toLocaleTimeString()}] AI: ${v.type}`]);
      };
      const result = await engine.initialize();
      if (!result.success) {
        // Cảnh báo nhưng vẫn cho vào thi – model lỗi không nên chặn bài thi
        console.warn('[Proctoring] Một số model không tải được:', result.errors);
      }
    } catch (err: any) {
      // Lỗi nghiêm trọng – vẫn cho tiếp tục nhưng ghi log
      console.error('[Proctoring] Init error (non-blocking):', err);
    } finally {
      setProctoringLoading(false);
    }
  };

  // PROCTORING: Xử lý sau khi chụp ảnh xác thực
  const handleReferencePhotoCaptured = async (imageData: string) => {
    setCaptureErrorMsg('');
    try {
      if (proctoringEngineRef.current) {
        setProctoringLoading(true);
        try {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Không thể tải ảnh đã chụp'));
            img.src = imageData;
          });

          const ok = await proctoringEngineRef.current.registerFace(img);
          if (!ok) {
            setCaptureErrorMsg('Không phát hiện khuôn mặt trong ảnh. Vui lòng chụp lại rõ nét, đủ ánh sáng và không đeo khẩu trang.');
            setProctoringLoading(false);
            return;
          }
        } catch (faceErr: any) {
          console.warn('[Proctoring] registerFace failed (non-blocking):', faceErr);
        } finally {
          setProctoringLoading(false);
        }
      }

      setShowPhotoCapture(false);
      await performStartExam();
    } catch (err: any) {
      console.error('[Proctoring] Registration error:', err);
      setProctoringLoading(false);
      setCaptureErrorMsg('Lỗi hệ thống khi xác thực khuôn mặt: ' + (err.message || 'Vui lòng thử lại'));
    }
  };

  // PROCTORING: Bật webcam + chạy engine
  const startProctoringMonitor = async (sId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }, audio: false,
      });
      setWebcamStream(stream);
      const video = document.createElement('video');
      video.srcObject = stream; video.autoplay = true;
      video.playsInline = true; video.muted = true;
      await video.play();
      proctoringVideoRef.current = video;
      if (proctoringEngineRef.current) {
        proctoringEngineRef.current.connectWebSocket(sId, examId || '', studentName);
        proctoringEngineRef.current.start(video);
      }
    } catch (err) {
      console.error('[Proctoring] Không mở được webcam:', err);
    }
  };

  // ========================================================
  // 4. BẮT ĐẦU HOẶC TIẾP TỤC BÀI THI
  // ========================================================
  const startExam = async () => {
    // Nếu có một trong các tính năng giám sát (Camera hoặc Strict Mode) -> Khởi tạo Engine
    if (examInfo?.requireCamera || examInfo?.strictMode) {
      await initProctoring();
    }

    // Nếu bật camera → hiện màn chụp ảnh trước khi vào Fullscreen
    if (examInfo?.requireCamera) {
      setShowPhotoCapture(true);
      return;
    }

    // Nếu không cần camera, vào luôn Fullscreen và Start
    if (examInfo?.strictMode) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        alert("Trình duyệt từ chối Toàn màn hình. Vui lòng thử lại!");
        return;
      }
    }
    await performStartExam();
  };

  const performStartExam = async () => {
    // Nếu Strict Mode mà chưa ở Fullscreen (do vừa cấp quyền Cam xong), bật Fullscreen ngay lúc này
    if (examInfo?.strictMode && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn('Không thể vào Fullscreen lúc này:', err);
      }
    }

    setLoading(true);

    try {
      const res = await axiosClient.post(`/exams/${examId}/start`, {});

      const serverExamInfo = res.data.examInfo;
      setExamInfo(serverExamInfo);
      setSessionId(res.data.sessionId);
      setQuestions(res.data.questions);

      const draftAnswers: Record<string, string> = {};
      res.data.questions.forEach((q: any) => {
        if (q.currentAnswer) draftAnswers[q.id] = q.currentAnswer;
      });
      setAnswers(draftAnswers);

      const totalDurationSecs = serverExamInfo.durationMinutes * 60;

      if (res.data.sessionStartTime) {
        const now = new Date().getTime();
        const start = new Date(res.data.sessionStartTime).getTime();
        const elapsedSecs = Math.floor((now - start) / 1000);
        const remaining = totalDurationSecs - elapsedSecs;

        if (remaining <= 0) {
          alert("Đã hết thời gian làm bài!");
          executeSubmit(true);
          return;
        }
        setTimeLeft(remaining);
      } else {
        setTimeLeft(totalDurationSecs);
      }

      setIsStarted(true);

      // Kết nối WebSocket để ghi nhận vi phạm (kể cả khi không có camera nhưng có strict mode)
      if (res.data.sessionId && (serverExamInfo.requireCamera || serverExamInfo.strictMode)) {
        if (serverExamInfo.requireCamera) {
          await startProctoringMonitor(res.data.sessionId);
        } else {
          // Chỉ kết nối socket để báo lỗi tab/fullscreen
          proctoringEngineRef.current?.connectWebSocket(res.data.sessionId, examId || '', studentName);
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Lỗi khi khởi tạo đề thi!");
      if (document.fullscreenElement) document.exitFullscreen();
    } finally {
      setLoading(false);
    }
  };

  const resumeFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsWarningFullscreen(false);
    } catch (err) {
      alert("Phải cấp quyền toàn màn hình để làm bài!");
    }
  };

  const preventCheating = (e: React.ClipboardEvent | React.MouseEvent) => {
    if (examInfo?.strictMode) {
      e.preventDefault();
      const type = e.type; // 'copy', 'paste', 'contextmenu', v.v.
      // Ghi nhận vào Engine
      proctoringEngineRef.current?.emitViolation('COPY_PASTE', { action: type });
      alert("Chức năng bị khóa trong phòng thi!");
    }
  };

  // ========================================================
  // 5. AUTO-SAVE VÀ NỘP BÀI 
  // ========================================================
  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    if (sessionId) {
      try {
        await axiosClient.post(`/exams/sessions/${sessionId}/update-answer`, { questionId, answer });
      } catch (err) { console.error("Auto-save failed"); }
    }
  };

  const handleClearChoice = async (questionId: string) => {
    setAnswers(prev => { const newAns = { ...prev }; delete newAns[questionId]; return newAns; });
    if (sessionId) {
      try {
        await axiosClient.post(`/exams/sessions/${sessionId}/update-answer`, { questionId, answer: null });
      } catch (err) { }
    }
  };

  // Bấm nút nộp bài -> Hiện Modal Custom
  const requestSubmit = () => {
    showModal('confirm', 'Xác nhận nộp bài', 'Bạn có chắc chắn muốn nộp bài thi? Hành động này không thể hoàn tác.', () => {
      executeSubmit(false);
    });
  };

  // Logic thực thi nộp bài
  const executeSubmit = async (isAuto = false) => {
    setIsSubmitting(true);
    try {
      // Dừng proctoring trước khi nộp
      proctoringEngineRef.current?.stop();
      webcamStream?.getTracks().forEach(t => t.stop());

      const res = await axiosClient.post(`/exams/${examId}/submit`, {
        answers: answers,
        violationLogs: violationLogs
      });


      isFinishedRef.current = true;

      if (document.fullscreenElement) await document.exitFullscreen();

      let message = "Nộp bài thành công!";
      if (res.data && res.data.message) {
        message = res.data.message;
      }
      if (isAuto) {
        message = "Đã hết giờ! Bài thi đã được tự động nộp. " + (res.data?.message ? `(${res.data.message})` : "");
      }

      showModal('alert', 'Thành công', message, () => {
        navigate(-1);
      });

    } catch (error) {
      alert("Lỗi khi nộp bài!");
      setIsSubmitting(false);
    }
  };

  // Cleanup proctoring khi unmount
  useEffect(() => {
    return () => {
      proctoringEngineRef.current?.stop();
      webcamStream?.getTracks().forEach(t => t.stop());
      proctoringVideoRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToQuestion = (idx: number) => {
    const element = document.getElementById(`q-${idx}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'SV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) return <div className="exam-lobby" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><FaSpinner className="fa-spin" size={40} color="#64748b" /></div>;

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice((currentPage - 1) * questionsPerPage, currentPage * questionsPerPage);
  const answeredCount = Object.keys(answers).length;

  return (
    <div
      className="exam-room-container"
      onCopy={preventCheating}
      onPaste={preventCheating}
      onCut={preventCheating}
      onContextMenu={preventCheating}
    >
      {/* ================= CHỤP ẢNH XÁC THỰC DANH TÍNH ================= */}
      {showPhotoCapture && (
        <ReferencePhotoCapture
          onCapture={handleReferencePhotoCaptured}
          externalErrorMsg={captureErrorMsg}
          onErrorMsgRead={() => setCaptureErrorMsg('')}
        />
      )}

      {/* ================= PROCTORING LOADING ================= */}
      {proctoringLoading && (
        <div className="custom-modal-overlay">
          <div className="custom-modal" style={{ textAlign: 'center' }}>
            <FaSpinner className="fa-spin" size={40} color="#3b82f6" />
            <h3 className="custom-modal-title" style={{ marginTop: 16 }}>Đang tải hệ thống AI giám sát...</h3>
            <p className="custom-modal-msg">Vui lòng đợi trong giây lát</p>
          </div>
        </div>
      )}

      {/* ================= CUSTOM MODAL OVERLAY ================= */}
      {modalConfig.isOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="custom-modal-icon">
              {modalConfig.type === 'confirm' ? <FaExclamationTriangle size={40} color="#f59e0b" /> : <FaCheckCircle size={40} color="#10b981" />}
            </div>
            <h3 className="custom-modal-title">{modalConfig.title}</h3>
            <p className="custom-modal-msg">{modalConfig.message}</p>
            <div className="custom-modal-actions">
              {modalConfig.type === 'confirm' && (
                <button className="btn-modal-cancel" onClick={closeModal}>Hủy</button>
              )}
              <button
                className="btn-modal-confirm"
                onClick={() => {
                  closeModal();
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CẢNH BÁO VI PHẠM FULLSCREEN */}
      {isWarningFullscreen && (
        <div className="fullscreen-warning-overlay">
          <FaExclamationTriangle size={60} color="#dc3545" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '28px', margin: '0 0 10px 0' }}>CẢNH BÁO VI PHẠM!</h2>
          <p style={{ fontSize: '18px', maxWidth: '600px', lineHeight: '1.5' }}>
            Bạn đã thoát khỏi chế độ Toàn màn hình. Hành động đã bị ghi lại!
          </p>
          <button className="btn-resume" onClick={resumeFullscreen}>
            QUAY LẠI BÀI THI
          </button>
        </div>
      )}

      {/* ================= LOBBY ================= */}
      {!isStarted && (
        <div className="exam-lobby">
          <div className="lobby-card">
            <h1 className="lobby-title">{examInfo?.title || 'Kỳ thi Trực tuyến'}</h1>

            <div className="lobby-meta">
              <div className="meta-item"><FaClock color="#3b82f6" /><span>{examInfo?.durationMinutes} Phút</span></div>
              <div className="meta-item"><FaListOl color="#3b82f6" /><span>{examInfo?.maxQuestions || 0} Câu hỏi</span></div>
            </div>

            <div className="lobby-rules">
              <div className="lobby-rules-header"><FaExclamationTriangle size={18} /> NỘI QUY PHÒNG THI</div>
              <ul className="lobby-rules-list">
                {examInfo?.strictMode && (
                  <>
                    <li>Bài thi yêu cầu chế độ <strong>Toàn màn hình (Full-screen)</strong>.</li>
                    <li>Hệ thống <strong>chặn Copy-Paste</strong> và <strong>ghi lại toàn bộ lịch sử chuyển tab hoặc thu nhỏ trình duyệt</strong>.</li>
                  </>
                )}
                {examInfo?.requireCamera && (
                  <li>Hệ thống giám sát qua <strong>Webcam AI</strong>. Yêu cầu sinh viên giữ khuôn mặt luôn nằm trong khung hình.</li>
                )}
                <li>Bài thi sẽ tự động nộp khi đồng hồ đếm ngược kết thúc. Chúc bạn thi tốt!</li>
              </ul>
            </div>

            <button className="btn-start-exam" onClick={startExam}>
              <FaPlay size={14} style={{ marginTop: '2px' }} /> TÔI ĐÃ HIỂU, BẮT ĐẦU LÀM BÀI
            </button>
          </div>
        </div>
      )}

      {/* ================= GIAO DIỆN LÀM BÀI ================= */}
      {isStarted && (
        <>
          <div className="exam-top-bar">
            <h1 className="exam-course-name">{examInfo?.title || 'Đang thi'}</h1>
          </div>

          <div className="exam-main-layout">
            <div className="exam-questions-area">
              {currentQuestions.map((q, idx) => {
                const actualIndex = (currentPage - 1) * questionsPerPage + idx + 1;
                const hasAnswer = !!answers[q.id];

                return (
                  <div key={q.id} className="modern-q-card" id={`q-${actualIndex}`}>
                    <div className="modern-q-header">
                      <h3 className="modern-q-title">{actualIndex}.</h3>
                      <div className="modern-q-text">{q.content}</div>
                    </div>

                    {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                      <div className="modern-options">
                        {q.options.map((opt: any) => {
                          const isSelected = answers[q.id] === opt.id;
                          return (
                            <label key={opt.id} className="modern-option">
                              <input type="radio" name={`q_${q.id}`} value={opt.id} checked={isSelected} onChange={() => handleAnswerChange(q.id, opt.id)} />
                              <span>{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.questionType === 'ESSAY' && (
                      <textarea className="modern-textarea" value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} placeholder="Viết câu trả lời của bạn vào đây..." />
                    )}

                    {hasAnswer && q.questionType === 'MULTIPLE_CHOICE' && (
                      <span className="modern-clear-choice" onClick={() => handleClearChoice(q.id)}>Xóa lựa chọn</span>
                    )}
                  </div>
                );
              })}

              <div className="exam-pagination">
                <button className="btn-nav" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&larr; Trang trước</button>
                <button className="btn-nav" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Trang tiếp &rarr;</button>
              </div>
            </div>

            <div className="exam-sidebar">
              <div className="timer-card">
                <FaClock size={20} />
                {formatTime(timeLeft)}
              </div>

              <div className="sidebar-card">
                <div className="student-profile">
                  <div className="student-avatar">{getInitials(studentName)}</div>
                  <div className="student-info">
                    <div className="student-name">{studentName}</div>
                    <div className="student-role">Sinh viên tham gia thi</div>
                  </div>
                </div>

                <div className="q-grid-title">
                  <span>Bảng câu hỏi</span>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>{answeredCount}/{questions.length}</span>
                </div>

                <div className="q-grid">
                  {questions.map((q, i) => {
                    const qPage = Math.floor(i / questionsPerPage) + 1;
                    const isAnswered = !!answers[q.id];
                    const isActive = currentPage === qPage;

                    return (
                      <button
                        key={q.id}
                        className={`modern-grid-btn ${isAnswered ? 'answered' : ''} ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPage(qPage);
                          setTimeout(() => scrollToQuestion(i + 1), 100);
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                {/* SỬ DỤNG HÀM requestSubmit ĐỂ GỌI MODAL THAY VÌ ALERT NATIVE */}
                <button className="btn-submit-final" onClick={requestSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                  {isSubmitting ? 'ĐANG NỘP BÀI...' : 'NỘP BÀI THI'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= WEBCAM OVERLAY (góc phải dưới) ================= */}
      {isStarted && examInfo?.requireCamera && webcamStream && (
        <ProctoringOverlay videoStream={webcamStream} status={proctoringStatus} />
      )}
    </div>
  );
}