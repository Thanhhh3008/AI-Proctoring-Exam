import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import './TeacherExamGrading.css';

const VIOLATION_LABELS: Record<string, string> = {
  TAB_SWITCH: 'Rời màn hình/Chuyển tab',
  FULLSCREEN_EXITED: 'Thoát toàn màn hình',
  COPY_PASTE: 'Thao tác chặn',
  MULTIPLE_FACES: 'Phát hiện nhiều người',
  NO_FACE: 'Không thấy mặt',
  DIFFERENT_PERSON: 'Sai người thi',
  LOOKING_AWAY: 'Nghi vấn nhìn chỗ khác',
  PHONE_DETECTED: 'Dùng điện thoại',
  STATIC_IMAGE: 'Sử dụng ảnh tĩnh',
};

export default function TeacherExamGradingDetail() {
  const { examId, sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [essayScores, setEssayScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const toastTimer = useRef<any>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    toastTimer.current = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

  // ==========================================
  // FETCH DATA
  // ==========================================
  const fetchDetail = async () => {
    try {
      const res = await axiosClient.get(`/exams/sessions/${sessionId}/detail`);
      setDetail(res.data);

      const initialScores: Record<string, string> = {};
      res.data.answers.forEach((a: any) => {
        if (a.questionType === 'ESSAY' && a.achievedScore !== null) {
          initialScores[a.id] = a.achievedScore.toString();
        }
      });
      setEssayScores(initialScores);
    } catch (error) {
      console.error('Lỗi tải chi tiết phiên thi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [sessionId]);

  // ==========================================
  // CHẤM ĐIỂM
  // ==========================================
  const handleSaveScore = async (answerId: string) => {
    const scoreStr = essayScores[answerId];
    if (scoreStr === undefined || scoreStr === '') {
      showToast('Vui lòng nhập điểm.', 'error');
      return;
    }

    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0) {
      showToast('Điểm không hợp lệ.', 'error');
      return;
    }

    setSavingId(answerId);
    try {
      const res = await axiosClient.patch(`/exams/sessions/answers/${answerId}/grade`, { score });

      // Cập nhật UI
      const updatedAnswers = detail.answers.map((a: any) =>
        a.id === answerId ? { ...a, achievedScore: score } : a
      );
      
      if (res.data.allGraded) {
        setDetail({
          ...detail,
          answers: updatedAnswers,
          session: { ...detail.session, totalScore: parseFloat(res.data.totalScore), status: 'GRADED' }
        });
        showToast(`Hoàn thành! Tổng điểm: ${res.data.totalScore}/10`);
      } else {
        setDetail({ ...detail, answers: updatedAnswers });
        showToast('Đã lưu điểm.');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi khi lưu điểm.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getDiffClass = (diff: string) => {
    if (diff === 'EASY') return 'gr-q-tag-easy';
    if (diff === 'MEDIUM') return 'gr-q-tag-medium';
    return 'gr-q-tag-hard';
  };

  const getDiffLabel = (diff: string) => {
    if (diff === 'EASY') return 'Dễ';
    if (diff === 'MEDIUM') return 'TB';
    return 'Khó';
  };

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`grading-q-${idx}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="eg-loading-state">
        <div className="eg-spin" style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%' }} />
        <span>Đang tải bài thi...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="eg-loading-state">
        <span>Không tìm thấy dữ liệu.</span>
        <button className="eg-back-btn" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  const { answers, student, exam, session, violationLogs } = detail;
  const totalPages = Math.ceil(answers.length / questionsPerPage);
  const currentAnswers = answers.slice((currentPage - 1) * questionsPerPage, currentPage * questionsPerPage);

  const mcqCount = answers.filter((a: any) => a.questionType === 'MULTIPLE_CHOICE').length;
  const essayCount = answers.filter((a: any) => a.questionType === 'ESSAY').length;
  const gradedEssays = answers.filter((a: any) => a.questionType === 'ESSAY' && a.achievedScore !== null).length;
  const pointPerQuestion = 10 / (answers.length || 1);

  return (
    <div className="gr-container">
      {/* Toast */}
      {toast.show && (
        <div className={`gr-toast ${toast.type === 'success' ? 'gr-toast-success' : 'gr-toast-error'}`}>
          {toast.message}
        </div>
      )}

      {/* Top Bar */}
      <div className="gr-topbar">
        <div className="gr-topbar-left">
          <h1>Chấm bài — {student.fullName}</h1>
          <p>{exam.title} &middot; {student.email}</p>
        </div>
        <button className="gr-topbar-back" onClick={() => navigate(`/teacher/exam/${examId}/grading`)}>
          ← Quay lại danh sách
        </button>
      </div>

      {/* Main Layout */}
      <div className="gr-layout">
        {/* Left - Questions */}
        <div className="gr-questions">
          {currentAnswers.map((answer: any, idx: number) => {
            const actualIndex = (currentPage - 1) * questionsPerPage + idx + 1;
            const isMCQ = answer.questionType === 'MULTIPLE_CHOICE';
            const isEssay = answer.questionType === 'ESSAY';

            return (
              <div key={answer.id} className="gr-q-block" id={`grading-q-${actualIndex}`}>
                {/* Question Header */}
                <div className="gr-q-header">
                  <span className="gr-q-num">{actualIndex}.</span>
                  <span className="gr-q-content">{answer.questionContent}</span>
                </div>

                {/* Tags */}
                <div className="gr-q-meta">
                  <span className={`gr-q-tag ${isMCQ ? 'gr-q-tag-mcq' : 'gr-q-tag-essay'}`}>
                    {isMCQ ? 'Trắc nghiệm' : 'Tự luận'}
                  </span>
                  <span className={`gr-q-tag ${getDiffClass(answer.difficulty)}`}>
                    {getDiffLabel(answer.difficulty)}
                  </span>
                </div>

                {/* MCQ Options */}
                {isMCQ && answer.options && (
                  <>
                    <div className="gr-options">
                      {(answer.options as any[]).map((opt: any) => {
                        const isCorrect = opt.id === answer.correctAnswer;
                        const isStudentChoice = opt.id === answer.studentAnswer;
                        const isWrongChoice = isStudentChoice && !isCorrect;

                        let className = 'gr-option';
                        if (isCorrect) className += ' gr-option-correct';
                        else if (isWrongChoice) className += ' gr-option-wrong';

                        return (
                          <div key={opt.id} className={className}>
                            <span className="gr-option-dot">
                              {isCorrect ? '✓' : isWrongChoice ? '✗' : ''}
                            </span>
                            <span>{opt.text}</span>
                            {isStudentChoice && !isCorrect && (
                              <span className="gr-option-label" style={{ color: '#991b1b' }}>SV chọn</span>
                            )}
                            {isCorrect && (
                              <span className="gr-option-label" style={{ color: '#166534' }}>Đáp án đúng</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* MCQ Score */}
                    <div className={`gr-mcq-score ${answer.achievedScore > 0 ? 'gr-mcq-score-correct' : 'gr-mcq-score-wrong'}`}>
                      {answer.achievedScore > 0
                        ? `+${Number(answer.achievedScore).toFixed(2)} điểm`
                        : '0 điểm'
                      }
                    </div>
                  </>
                )}

                {/* Essay */}
                {isEssay && (
                  <>
                    {/* Student's Answer */}
                    <div className="gr-essay-answer">
                      <div className="gr-essay-answer-title">Bài làm của sinh viên</div>
                      {answer.studentAnswer ? (
                        <div className="gr-essay-answer-text">{answer.studentAnswer}</div>
                      ) : (
                        <div className="gr-essay-empty">Sinh viên không trả lời câu này.</div>
                      )}
                    </div>

                    {/* Grading Input */}
                    <div className="gr-essay-grade">
                      <span className="gr-essay-grade-label">Điểm:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={pointPerQuestion}
                        className="gr-score-input"
                        placeholder="0"
                        value={essayScores[answer.id] ?? (answer.achievedScore !== null ? answer.achievedScore.toString() : '')}
                        onChange={e => {
                          let val = e.target.value;
                          if (val !== '') {
                            const num = parseFloat(val);
                            if (num > pointPerQuestion) val = pointPerQuestion.toFixed(2);
                            if (num < 0) val = '0';
                          }
                          setEssayScores(prev => ({ ...prev, [answer.id]: val }));
                        }}
                      />
                      <span className="gr-score-max">/ {pointPerQuestion.toFixed(2)}</span>
                      <button
                        className="gr-save-btn"
                        onClick={() => handleSaveScore(answer.id)}
                        disabled={savingId === answer.id}
                      >
                        {savingId === answer.id ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      {answer.achievedScore !== null && (
                        <span className="gr-scored-text">
                          ✓ {Number(answer.achievedScore).toFixed(2)}/{pointPerQuestion.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="gr-pagination">
              <button
                className="gr-page-btn"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Trang trước
              </button>
              <span style={{ fontSize: '13px', color: '#6b7280', alignSelf: 'center' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="gr-page-btn"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Trang tiếp →
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="gr-sidebar">
          {/* Student Info */}
          <div className="gr-sidebar-card">
            <div className="gr-student-info">
              <div className="gr-avatar">{getInitials(student.fullName)}</div>
              <div>
                <div className="gr-student-name">{student.fullName}</div>
                <div className="gr-student-email">{student.email}</div>
              </div>
            </div>

            {/* Score */}
            <div className="gr-score-display">
              <div className="gr-score-number" style={{
                color: session.totalScore !== null
                  ? (session.totalScore < 5 ? '#991b1b' : '#111827')
                  : '#9ca3af'
              }}>
                {session.totalScore !== null ? Number(session.totalScore).toFixed(2) : '—'}
              </div>
              <div className="gr-score-of">/ 10 điểm</div>
            </div>

            {/* Session Stats */}
            <div className="gr-session-stats">
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{mcqCount}</div>
                <div className="gr-session-stat-label">Trắc nghiệm</div>
              </div>
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{essayCount}</div>
                <div className="gr-session-stat-label">Tự luận</div>
              </div>
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{gradedEssays}/{essayCount}</div>
                <div className="gr-session-stat-label">Đã chấm</div>
              </div>
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{answers.length}</div>
                <div className="gr-session-stat-label">Tổng câu</div>
              </div>
            </div>

            {/* Question Grid */}
            <div className="gr-grid-title">
              <span>Bảng câu hỏi</span>
              <span className="gr-grid-count">
                {session.submitTime
                  ? `Nộp: ${new Date(session.submitTime).toLocaleTimeString('vi-VN')}`
                  : ''
                }
              </span>
            </div>

            <div className="gr-grid">
              {answers.map((a: any, i: number) => {
                const qPage = Math.floor(i / questionsPerPage) + 1;
                const isGraded = a.achievedScore !== null;
                const isEssayUngraded = a.questionType === 'ESSAY' && !isGraded;
                const isActive = currentPage === qPage;

                let className = 'gr-grid-btn';
                if (isGraded) className += ' graded';
                if (isEssayUngraded) className += ' needs-grade';
                if (isActive) className += ' active';

                return (
                  <button
                    key={a.id}
                    className={className}
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

            <button className="gr-finish-btn" onClick={() => navigate(`/teacher/exam/${examId}/grading`)}>
              ← Quay lại danh sách
            </button>
          </div>

          {/* Violations */}
          {violationLogs && violationLogs.length > 0 && (
            <div className="gr-sidebar-card">
              <div className="gr-violations">
                <div className="gr-violations-title">
                  Vi phạm ({violationLogs.length})
                </div>
                {violationLogs.map((log: any, idx: number) => (
                  <div key={idx} className="gr-violation-item">
                    {new Date(log.timestamp).toLocaleTimeString('vi-VN')} — {VIOLATION_LABELS[log.type] || log.type}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
