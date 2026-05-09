import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import './TeacherExamGrading.css';

export default function TeacherExamGrading() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axiosClient.get(`/exams/${examId}/sessions`);
        setExamInfo(res.data.exam);
        setSessions(res.data.sessions);
        setTotalStudents(res.data.totalStudents);
      } catch (error) {
        console.error('Lỗi tải danh sách phiên thi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [examId]);

  const getStatusLabel = (session: any) => {
    if (session.status === 'GRADED')
      return <span className="eg-label eg-label-graded">Đã chấm</span>;
    if (session.status === 'IN_PROGRESS')
      return <span className="eg-label eg-label-progress">Đang làm</span>;
    if (session.needsGrading)
      return <span className="eg-label eg-label-pending">Chờ chấm</span>;
    return <span className="eg-label eg-label-submitted">Đã nộp</span>;
  };

  const submittedCount = sessions.filter(s => s.status !== 'IN_PROGRESS').length;
  const needsGradingCount = sessions.filter(s => s.needsGrading).length;
  const gradedCount = sessions.filter(s => s.status === 'GRADED' || (!s.hasEssay && s.totalScore !== null)).length;

  if (loading) {
    return (
      <div className="eg-loading-state">
        <div className="eg-spin" style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%' }} />
        <span>Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="eg-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div className="eg-page-header" style={{ marginBottom: 0 }}>
          <h1 className="eg-page-title">{examInfo?.title}</h1>
          <p className="eg-page-meta">
            Lớp {examInfo?.classCode} &middot; {examInfo?.maxQuestions} câu/đề &middot; {totalStudents} sinh viên
          </p>
        </div>
        <button className="eg-back-btn" onClick={() => {
          if (examInfo?.courseActivity?.id) {
            navigate(`/teacher/activity/${examInfo.courseActivity.id}`);
          } else {
            navigate(-1);
          }
        }}>
          ← Quay lại
        </button>
      </div>

      {/* Stats */}
      <div className="eg-stats">
        <div className="eg-stat">
          <div className="eg-stat-number">{submittedCount}</div>
          <div className="eg-stat-text">Đã nộp</div>
        </div>
        <div className="eg-stat">
          <div className="eg-stat-number">{needsGradingCount}</div>
          <div className="eg-stat-text">Chờ chấm</div>
        </div>
        <div className="eg-stat">
          <div className="eg-stat-number">{gradedCount}</div>
          <div className="eg-stat-text">Đã chấm</div>
        </div>
        <div className="eg-stat">
          <div className="eg-stat-number">{totalStudents - submittedCount}</div>
          <div className="eg-stat-text">Chưa thi</div>
        </div>
      </div>

      {/* Table */}
      {sessions.length === 0 ? (
        <div className="eg-empty-state">
          <p>Chưa có sinh viên nào làm bài</p>
          <p>Dữ liệu sẽ xuất hiện khi sinh viên bắt đầu bài thi.</p>
        </div>
      ) : (
        <div className="eg-table-wrap">
          <table className="eg-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Thời gian nộp</th>
                <th>Tự luận</th>
                <th>Điểm</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td>
                    <div className="eg-name">{session.student.fullName}</div>
                    <div className="eg-email">{session.student.email}</div>
                  </td>
                  <td>
                    {session.submitTime
                      ? new Date(session.submitTime).toLocaleString('vi-VN')
                      : <span style={{ color: '#9ca3af' }}>—</span>
                    }
                  </td>
                  <td>
                    {session.hasEssay ? (
                      <span style={{ color: session.ungradedCount > 0 ? '#991b1b' : '#166534', fontWeight: 600, fontSize: '13px' }}>
                        {session.ungradedCount > 0
                          ? `${session.ungradedCount}/${session.essayCount} chưa chấm`
                          : `${session.essayCount}/${session.essayCount} đã chấm`
                        }
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td>
                    {session.totalScore !== null ? (
                      <span style={{ fontWeight: 700, fontSize: '15px', color: session.totalScore < 5 ? '#991b1b' : '#111827' }}>
                        {Number(session.totalScore).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td>{getStatusLabel(session)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {session.status !== 'IN_PROGRESS' && (
                      <button
                        className={`eg-action-btn ${session.needsGrading ? 'eg-action-btn-primary' : ''}`}
                        onClick={() => navigate(`/teacher/exam/${examId}/session/${session.id}/grade`)}
                      >
                        {session.needsGrading ? 'Chấm bài' : 'Xem bài'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
