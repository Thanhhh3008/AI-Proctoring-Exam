import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { FaPlay, FaExclamationTriangle, FaDesktop, FaClock, FaSpinner, FaCheckCircle, FaListOl, FaInfoCircle, FaUser } from 'react-icons/fa';
import { notification, message } from 'antd';
import './StudentExamRoom.css';

// ===================== PROCTORING IMPORTS =====================
import { ProctoringEngine } from '../../proctoring/ProctoringEngine';
import type { ProctoringStatus, ViolationEvent } from '../../proctoring/types';
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
  const [studentFaceUrl, setStudentFaceUrl] = useState<string | null>(null);
  const [studentFaceVerified, setStudentFaceVerified] = useState<boolean>(false);

  // Trạng thái
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFinishedRef = useRef(false); // Cờ đánh dấu đã nộp bài xong

  // Trạng thái Vi phạm
  const [violationLogs, setViolationLogs] = useState<string[]>([]);

  // ===================== PROCTORING STATES =====================

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
          if (resUser.data) {
            setStudentFaceUrl(resUser.data.baseFaceUrl || null);
            setStudentFaceVerified(resUser.data.facePhotoVerified || false);
          }
        } catch (e) {
          console.warn("Không lấy được thông tin sinh viên", e);
        }

        const resExam = await axiosClient.get(`/exams/${examId}`);
        setExamInfo(resExam.data);

      } catch (error: any) {
        notification.error({ message: 'Lỗi', description: 'Không thể tải thông tin kỳ thi.' });
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [examId, navigate]);

  // ========================================================
  // 2. LUÔN LUÔN GIÁM SÁT CHUYỂN TAB (không phụ thuộc strictMode)
  // ========================================================
  useEffect(() => {
    if (!isStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isFinishedRef.current) {
        proctoringEngineRef.current?.emitViolation('TAB_SWITCH');
        notification.error({
          message: 'CẢNH BÁO VI PHẠM',
          description: 'Bạn vừa rời khỏi màn hình bài thi. Hành vi này đã được ghi lại vào hệ thống giám sát!',
          placement: 'top',
          duration: 5,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      // Lỗi khởi tạo – vẫn cho tiếp tục nhưng ghi log
      console.error('[Proctoring] Init error (non-blocking):', err);
    } finally {
      setProctoringLoading(false);
    }
  };

  // PROCTORING: Tải ảnh khuôn mặt đã xác nhận từ server và đăng ký vào engine
  const loadVerifiedFacePhoto = async (): Promise<boolean> => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await axiosClient.get('/users/me');
      const { baseFaceUrl, facePhotoVerified } = res.data;

      if (!facePhotoVerified || !baseFaceUrl) {
        return false; // Chưa có ảnh hợp lệ
      }

      if (!proctoringEngineRef.current) return false;

      const fullUrl = baseFaceUrl.startsWith('http') ? baseFaceUrl : `${API_BASE}${baseFaceUrl}`;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Không tải được ảnh xác thực'));
        img.src = fullUrl;
      });

      const ok = await proctoringEngineRef.current.registerFace(img);
      if (!ok) {
        console.warn('[Proctoring] Không nhận diện được khuôn mặt trong ảnh đã duyệt');
        return false;
      }

      // Lưu ảnh tham chiếu để hiển thị cho giảng viên so sánh
      (proctoringEngineRef.current as any)._referencePhotoUrl = fullUrl;
      console.log('[Proctoring] Đã tải ảnh xác thực từ server:', fullUrl);
      return true;
    } catch (err) {
      console.warn('[Proctoring] Lỗi tải ảnh xác thực (non-blocking):', err);
      return false;
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
  // 4. BẮt ĐẦU HOẶC TIẾ TỤC BÀI THI
  // ========================================================
  const startExam = async () => {
    // Luôn khởi tạo Proctoring Engine
    await initProctoring();

    if (examInfo?.requireCamera) {
      // Kiểm tra ảnh xác thực từ server
      setProctoringLoading(true);
      const res = await axiosClient.get('/users/me').catch(() => null);
      const { baseFaceUrl, facePhotoVerified } = res?.data || {};
      setProctoringLoading(false);

      if (!baseFaceUrl || !facePhotoVerified) {
        notification.error({
          message: 'Chưa có ảnh xác thực khuôn mặt',
          description: (
            <>
              Bạn cần đăng ký ảnh chân dung và được Admin xác nhận trước khi tham gia kỳ thi có giám sát AI.
              Vui lòng đến trang <strong>Hồ sơ cá nhân</strong> → <strong>Ảnh xác thực khuôn mặt</strong>.
            </>
          ),
          duration: 8,
          placement: 'top',
        });

        return;
      }
    }

    await performStartExam();
  };

  const performStartExam = async () => {

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

      // Luôn kết nối WebSocket để có thể báo vi phạm (kể cả khi không bật Camera/Strict Mode)
      if (res.data.sessionId) {
        if (serverExamInfo.requireCamera) {
          // Tải ảnh xác nhận từ server trước khi khởi động engine
          await loadVerifiedFacePhoto();
          await startProctoringMonitor(res.data.sessionId);
          // Lưu ảnh tham chiếu vào DB (URL từ baseFaceUrl đã ưu được trong ref)
          const refUrl = (proctoringEngineRef.current as any)?._referencePhotoUrl;
          if (refUrl) {
            try {
              await axiosClient.post(`/proctoring/session/${res.data.sessionId}/reference-photo`, { photoUrl: refUrl });
            } catch (e) {
              console.warn('[Proctoring] Không lưu được reference photo:', e);
            }
          }
        } else {
          // Không có camera → chỉ kết nối socket để báo tab switch và các vi phạm khác
          proctoringEngineRef.current?.connectWebSocket(res.data.sessionId, examId || '', studentName);
        }
      }
    } catch (error: any) {
      notification.warning({
        message: 'Không thể bắt đầu',
        description: error.response?.data?.message || "Lỗi khi khởi tạo đề thi!"
      });
      if (document.fullscreenElement) document.exitFullscreen();
    } finally {
      setLoading(false);
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
      message.error("Lỗi khi nộp bài!");
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
      {/* Chụp ảnh xác thực đã được thay thế bằng ảnh hồ sơ được Admin xác nhận */}

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
                  <li>Hệ thống <strong>chặn Copy-Paste</strong> và <strong>ghi lại toàn bộ lịch sử chuyển tab hoặc thu nhỏ trình duyệt</strong>.</li>
                )}
                {examInfo?.requireCamera && (
                  <li>Hệ thống giám sát qua <strong>Webcam AI</strong>. Yêu cầu sinh viên giữ khuôn mặt luôn nằm trong khung hình.</li>
                )}
                <li>Bài thi sẽ tự động nộp khi đồng hồ đếm ngược kết thúc. Chúc bạn thi tốt!</li>
              </ul>
            </div>

            {examInfo?.requireCamera && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ flexShrink: 0 }}>
                  {studentFaceUrl ? (
                    <img
                      src={studentFaceUrl.startsWith('http') ? studentFaceUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${studentFaceUrl}`}
                      alt="Ảnh xác thực"
                      style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: studentFaceVerified ? '3px solid #10b981' : '3px solid #f59e0b' }}
                    />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #ef4444' }}>
                      <FaUser size={24} color="#94a3b8" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#1e293b' }}>Ảnh xác thực khuôn mặt</h4>
                  {studentFaceUrl && studentFaceVerified ? (
                    <div style={{ fontSize: '13px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}><FaCheckCircle size={14} /> Đã xác nhận & sẵn sàng</div>
                  ) : studentFaceUrl && !studentFaceVerified ? (
                    <div style={{ fontSize: '13px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}><FaClock size={14} /> Đang chờ duyệt (Chưa thể vào thi)</div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}><FaExclamationTriangle size={14} /> Chưa đăng ký (Chưa thể vào thi)</div>
                  )}
                </div>
              </div>
            )}

            <button className="btn-start-exam" onClick={startExam} style={{ marginTop: '25px' }}>
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