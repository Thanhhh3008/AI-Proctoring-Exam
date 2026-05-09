import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import '../TeacherExamGrading/TeacherExamGrading.css';

export default function StudentExamReview() {
  const { examId, sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axiosClient.get(`/exams/sessions/${sessionId}/detail`);
        setDetail(res.data);
      } catch (error) {
        console.error('Lỗi tải chi tiết bài thi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [sessionId]);

  // Helpers
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
    const el = document.getElementById(`review-q-${idx}`);
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
        <span>Không tìm thấy dữ liệu bài thi.</span>
        <button className="eg-back-btn" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  const { answers, student, exam, session } = detail;
  const totalPages = Math.ceil(answers.length / questionsPerPage);
  const currentAnswers = answers.slice((currentPage - 1) * questionsPerPage, currentPage * questionsPerPage);

  const mcqCount = answers.filter((a: any) => a.questionType === 'MULTIPLE_CHOICE').length;
  const essayCount = answers.filter((a: any) => a.questionType === 'ESSAY').length;
  const mcqCorrect = answers.filter((a: any) => a.questionType === 'MULTIPLE_CHOICE' && a.achievedScore > 0).length;
  const pointPerQuestion = 10 / (answers.length || 1);

  return (
    <div className="gr-container">
      {/* Top Bar */}
      <div className="gr-topbar">
        <div className="gr-topbar-left">
          <h1>Xem lại bài thi</h1>
          <p>{exam.title}</p>
        </div>
        <button className="gr-topbar-back" onClick={() => navigate(-1)}>
          ← Quay lại
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
              <div key={answer.id} className="gr-q-block" id={`review-q-${actualIndex}`}>
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
                              <span className="gr-option-label" style={{ color: '#991b1b' }}>Bạn chọn</span>
                            )}
                            {isCorrect && (
                              <span className="gr-option-label" style={{ color: '#166534' }}>Đáp án đúng</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                    <div className="gr-essay-answer">
                      <div className="gr-essay-answer-title">Bài làm của bạn</div>
                      {answer.studentAnswer ? (
                        <div className="gr-essay-answer-text">{answer.studentAnswer}</div>
                      ) : (
                        <div className="gr-essay-empty">Bạn không trả lời câu này.</div>
                      )}
                    </div>

                    {/* Hiển thị điểm đã chấm (chỉ đọc) */}
                    {answer.achievedScore !== null ? (
                      <div className="gr-essay-grade">
                        <span className="gr-essay-grade-label">Điểm GV chấm:</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                          {Number(answer.achievedScore).toFixed(2)}
                        </span>
                        <span className="gr-score-max">/ {pointPerQuestion.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="gr-essay-grade" style={{ background: '#fef9c3', borderColor: '#fde68a' }}>
                        <span className="gr-essay-grade-label" style={{ color: '#92400e' }}>
                          Đang chờ giảng viên chấm điểm
                        </span>
                      </div>
                    )}
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
          <div className="gr-sidebar-card">
            {/* Student Info */}
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

            {/* Stats */}
            <div className="gr-session-stats">
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{mcqCorrect}/{mcqCount}</div>
                <div className="gr-session-stat-label">TN đúng</div>
              </div>
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{essayCount}</div>
                <div className="gr-session-stat-label">Tự luận</div>
              </div>
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">{answers.length}</div>
                <div className="gr-session-stat-label">Tổng câu</div>
              </div>
              <div className="gr-session-stat">
                <div className="gr-session-stat-val">
                  {exam.durationMinutes}p
                </div>
                <div className="gr-session-stat-label">Thời lượng</div>
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
                const isCorrect = a.achievedScore !== null && a.achievedScore > 0;
                const isWrong = a.achievedScore !== null && a.achievedScore === 0;
                const isPending = a.achievedScore === null;
                const isActive = currentPage === qPage;

                let className = 'gr-grid-btn';
                if (isCorrect) className += ' graded';
                if (isPending) className += ' needs-grade';
                if (isActive) className += ' active';

                return (
                  <button
                    key={a.id}
                    className={className}
                    onClick={() => {
                      setCurrentPage(qPage);
                      setTimeout(() => scrollToQuestion(i + 1), 100);
                    }}
                    title={isCorrect ? 'Đúng' : isWrong ? 'Sai' : isPending ? 'Chưa chấm' : ''}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <button className="gr-finish-btn" onClick={() => navigate(-1)}>
              ← Quay lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
