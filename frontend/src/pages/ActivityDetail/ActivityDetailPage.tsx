import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  FaCheckSquare, FaFileUpload, FaArrowDown, FaFileAlt, FaChevronRight,
  FaGlobe, FaPaperclip, FaCheckCircle, FaTrashAlt, FaClock, FaLock,
  FaRegClock, FaHourglassHalf, FaClipboardList, FaInfoCircle, FaDesktop, FaVideo
} from 'react-icons/fa';
import './ActivityDetailPage.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const extractFileName = (url: string) => {
  if (!url) return 'Tệp đính kèm';
  const parts = url.split('/');
  return parts[parts.length - 1];
};

const calculateTimeDiff = (dueDateStr: string, submittedAtStr: string) => {
  if (!dueDateStr || !submittedAtStr) return null;

  const dueDate = new Date(dueDateStr).getTime();
  const submittedAt = new Date(submittedAtStr).getTime();

  const diffMs = dueDate - submittedAt;
  const isLate = diffMs < 0;

  const absDiff = Math.abs(diffMs);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  let timeString = '';
  if (days > 0) timeString += `${days} ngày `;
  if (hours > 0) timeString += `${hours} giờ `;
  if (minutes > 0 || timeString === '') timeString += `${minutes} phút`;

  return {
    isLate,
    text: isLate ? `Nộp trễ ${timeString.trim()}` : `Nộp sớm ${timeString.trim()}`,
    color: isLate ? '#dc2626' : '#16a34a',
    bgColor: isLate ? '#fef2f2' : '#f0fdf4',
    borderColor: isLate ? '#fecaca' : '#bbf7d0'
  };
};

export default function ActivityDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activity, setActivity] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isAddingSubmission, setIsAddingSubmission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      if (!id) return;
      const resAct = await axiosClient.get(`/activities/${id}`);
      setActivity(resAct.data);

      if (resAct.data.type === 'ASSIGNMENT') {
        try {
          const resSub = await axiosClient.get(`/activities/${id}/my-submission`);
          setSubmission(resSub.data);
        } catch (err: any) {
          if (err.response?.status !== 404) console.error(err);
          setSubmission(null);
        }
      }

      // NẾU LÀ EXAM: Fetch dữ liệu chi tiết của bài thi
      if (resAct.data.type === 'EXAM' && resAct.data.examId) {
        try {
          const examRes = await axiosClient.get(`/exams/${resAct.data.examId}`);
          setExamData(examRes.data);
        } catch (err) {
          console.error('Không thể tải cấu hình bài thi', err);
        }
      }

    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTriggerFileSelect = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setSelectedFiles(Array.from(e.target.files));
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length) setSelectedFiles(Array.from(e.dataTransfer.files));
  };

  const handleSaveSubmission = async () => {
    if (selectedFiles.length === 0) {
      alert('Vui lòng chọn ít nhất 1 file để nộp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);

      const res = await axiosClient.post(`/activities/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Đã nộp bài thành công!');
      setSubmission(res.data);
      setIsAddingSubmission(false);
      setSelectedFiles([]);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi nộp bài!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubmission = async () => {
    const isConfirm = window.confirm("Bạn có chắc chắn muốn gỡ bỏ bài nộp này? Dữ liệu sẽ không thể khôi phục.");
    if (!isConfirm) return;

    try {
      await axiosClient.delete(`/activities/${id}/my-submission`);
      alert('Đã gỡ bỏ bài nộp thành công!');
      setSubmission(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa bài nộp!');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
  if (!activity) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Không tìm thấy hoạt động này!</div>;

  const timeDiffStatus = submission && activity.dueDate ? calculateTimeDiff(activity.dueDate, submission.submittedAt) : null;
  const classId = activity.section?.classId;
  const classCode = activity.section?.class?.classCode;

  // ==========================================
  // LOGIC TÍNH TOÁN CHO BÀI THI (EXAM)
  // ==========================================
  let examStatus = 'UNKNOWN';
  let statusUI = { text: 'Không xác định', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', btnText: 'Không thể vào thi', btnDisabled: true };
  let totalQuestions = examData?.maxQuestions;
  let pointsPerQuestion = '0';

  if (examData) {
    const now = new Date().getTime();
    const start = new Date(examData.startTime).getTime();
    const end = new Date(examData.endTime).getTime();

    // 1. Tính toán trạng thái thời gian thực tế
    examStatus = examData.status;

    if (examStatus !== 'LOCKED' && examStatus !== 'ENDED') {
      if (now < start) examStatus = 'UPCOMING';
      else if (now > end) examStatus = 'ENDED';
      else examStatus = 'ONGOING';
    }

    // 2. KIỂM TRA ĐÃ NỘP BÀI CHƯA (Bao gồm tất cả trạng thái đã hoàn thành: SUBMITTED, GRADED, TIMED_OUT, FORCED_SUBMITTED...)
    const hasSubmitted = examData.studentSessionStatus && examData.studentSessionStatus !== 'IN_PROGRESS';

    // 3. Cấu hình giao diện theo trạng thái chặn
    if (examStatus === 'LOCKED') {
      statusUI = { text: 'ĐÃ BỊ KHÓA', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', btnText: 'Bài thi đang bị khóa', btnDisabled: true };
    } else if (hasSubmitted) {
      // Ưu tiên hiển thị nếu sinh viên đã nộp bài
      if (examData.studentScore === null) {
        statusUI = { text: 'ĐANG CHỜ CHẤM TỰ LUẬN', color: '#b45309', bg: '#fef9c3', border: '#fde047', btnText: 'Bài thi đang được chấm điểm', btnDisabled: true };
      } else {
        statusUI = { text: `ĐIỂM: ${examData.studentScore} / 10`, color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', btnText: 'Bạn đã hoàn thành bài thi', btnDisabled: true };
      }
    } else if (examStatus === 'UPCOMING') {
      statusUI = { text: 'CHƯA BẮT ĐẦU', color: '#b45309', bg: '#fef9c3', border: '#fde047', btnText: 'Chưa đến giờ làm bài', btnDisabled: true };
    } else if (examStatus === 'ENDED') {
      statusUI = { text: 'ĐÃ KẾT THÚC', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', btnText: 'Kỳ thi đã đóng', btnDisabled: true };
    } else if (examStatus === 'ONGOING') {
      statusUI = { text: 'ĐANG DIỄN RA', color: '#166534', bg: '#dcfce7', border: '#bbf7d0', btnText: 'Vào thi ngay', btnDisabled: false };

      // Nếu có mạng/thoát ra vào lại, đổi chữ nút cho thân thiện
      if (examData.studentSessionStatus === 'IN_PROGRESS') {
        statusUI.btnText = 'Tiếp tục làm bài';
      }
    }

    // 4. Tính toán điểm số
    totalQuestions = examData.maxQuestions || 0;
    if (totalQuestions > 0) {
      pointsPerQuestion = (10 / totalQuestions).toFixed(2);
      if (pointsPerQuestion.endsWith('.00')) pointsPerQuestion = parseInt(pointsPerQuestion).toString();
    }
  }

  return (
    <div className="act-container">

      {/* 1. THANH BREADCRUMB */}
      <div className="act-breadcrumb-wrapper">
        <div className="act-breadcrumb">
          <Link to="/dashboard" style={{ fontWeight: '600', textDecoration: "none", color: '#2563eb' }}>
            Các khóa học của tôi
          </Link>
          <FaChevronRight size={10} style={{ margin: '0 10px', color: '#94a3b8' }} />
          {classId && classCode && (
            <Link to={`/course/${classId}`} className="act-breadcrumb-item">Lớp {classCode}</Link>
          )}
          <FaChevronRight size={10} style={{ margin: '0 10px', color: '#94a3b8' }} />
          <div className="act-breadcrumb-active">{activity.title}</div>
        </div>
      </div>

      <div className="act-main-content">

        <div className="act-header-section">
          <div className="act-icon-box" style={{ backgroundColor: activity.type === 'EXAM' ? '#f43f5e' : activity.type === 'ASSIGNMENT' ? '#ec4899' : activity.type === 'URL' ? '#3b82f6' : '#0ea5e9' }}>
            {activity.type === 'EXAM' ? <FaCheckSquare size={24} /> : activity.type === 'ASSIGNMENT' ? <FaFileUpload size={24} /> : activity.type === 'URL' ? <FaGlobe size={24} /> : <FaFileAlt size={24} />}
          </div>
          <div>
            <div className="act-type-label">{activity.type}</div>
            <h1 className="act-title-text" style={{ color: activity.type === 'ASSIGNMENT' ? '#f97316' : '#1e3a8a' }}>
              {activity.title}
            </h1>
          </div>
        </div>

        <div className="act-description-section" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '25px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', color: '#1e293b' }}>Hướng dẫn từ giáo viên:</h3>
          {activity.description ? (
            <div style={{ color: '#475569', lineHeight: '1.6', marginBottom: '15px' }} dangerouslySetInnerHTML={{ __html: activity.description }} />
          ) : (
            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có mô tả thêm.</p>
          )}

          {activity.fileUrl && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0' }}>
              <FaPaperclip color="#3b82f6" size={18} />
              <div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#64748b' }}>Tệp đính kèm từ Giảng viên:</strong>
                <a
                  href={`${BACKEND_URL}${activity.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  {extractFileName(activity.fileUrl)}
                </a>
              </div>
            </div>
          )}
        </div>

        {(activity.type === 'FILE' || activity.type === 'URL') && (
          <div className="act-info-box">
            <h3 style={{ marginTop: 0 }}>Truy cập học liệu</h3>
            <p>Nhấn vào nút bên dưới để mở học liệu do Giảng viên cung cấp.</p>
            <a href={activity.type === 'FILE' ? `${BACKEND_URL}${activity.fileUrl}` : activity.fileUrl} target="_blank" rel="noreferrer" className="act-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
              {activity.type === 'FILE' ? 'Tải tập tin về máy' : 'Truy cập liên kết'}
            </a>
          </div>
        )}

        {/* ==================================================== */}
        {/* GIAO DIỆN BÀI THI CHO SINH VIÊN */}
        {/* ==================================================== */}
        {activity.type === 'EXAM' && examData && (
          <div style={{ paddingBottom: '50px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>

              <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Thông tin Kỳ thi
                </h2>
                <span style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold',
                  backgroundColor: statusUI.bg, color: statusUI.color, border: `1px solid ${statusUI.border}`
                }}>
                  {statusUI.text}
                </span>
              </div>

              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

                {/* Cột 1: Thời gian */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Thời gian mở đề:</div>
                    <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {new Date(examData.startTime).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Thời gian đóng đề (Hạn chót):</div>
                    <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {new Date(examData.endTime).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Thời gian làm bài:</div>
                    <div style={{ fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px' }}>
                      {examData.durationMinutes} phút
                    </div>
                  </div>
                </div>

                {/* Cột 2: Cấu trúc & Điểm */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '20px', borderLeft: '1px dashed #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Tổng số câu hỏi:</div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{totalQuestions} câu</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Thang điểm tổng:</div>
                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>10 Điểm</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Điểm mỗi câu:</div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{pointsPerQuestion} điểm </div>
                  </div>
                </div>

                {/* Cột 3: Bảo mật */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px', borderLeft: '1px dashed #e2e8f0' }}>
                  <div style={{ fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>Hệ thống bảo mật:</div>

                  {examData.requireCamera && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                      <FaVideo color="#3b82f6" size={16} style={{ marginTop: '2px' }} />
                      <span>Giám sát AI qua Camera (Bắt buộc)</span>
                    </div>
                  )}

                  {examData.strictMode && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                      <FaDesktop color="#8b5cf6" size={16} style={{ marginTop: '2px' }} />
                      <span>Chế độ Toàn màn hình & Khóa Tab</span>
                    </div>
                  )}

                  {!examData.requireCamera && !examData.strictMode && (
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Không sử dụng hệ thống giám sát</div>
                  )}
                </div>
              </div>

              <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="act-btn"
                  style={{
                    backgroundColor: statusUI.btnDisabled ? '#94a3b8' : '#e11d48',
                    color: 'white',
                    cursor: statusUI.btnDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    padding: '12px 40px',
                    margin: 0
                  }}
                  disabled={statusUI.btnDisabled}
                  onClick={async () => {
                    if (!statusUI.btnDisabled) {
                      // Chốt an toàn (Fallback): Thử gọi start, nếu Backend ném lỗi đã nộp bài thì chặn liền.
                      try {
                        await axiosClient.post(`/exams/${examData.id}/start`, {});
                        navigate(`/exam-room/${examData.id}`);
                      } catch (error: any) {
                        if (error.response?.data?.message?.includes('hoàn thành')) {
                          alert('Bạn đã hoàn thành bài thi này trước đó!');
                          fetchData(); // Tải lại để khóa nút
                        } else {
                          navigate(`/exam-room/${examData.id}`);
                        }
                      }
                    }
                  }}
                >
                  {statusUI.btnDisabled && <FaLock style={{ marginRight: '8px' }} />}
                  {statusUI.btnText}
                </button>

                {/* Nút Xem lại bài làm - chỉ hiển thị khi đã nộp bài */}
                {examData?.studentSessionId && examData?.studentSessionStatus && examData.studentSessionStatus !== 'IN_PROGRESS' && (
                  <button
                    className="act-btn"
                    style={{
                      backgroundColor: '#111827',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '12px 40px',
                      margin: 0
                    }}
                    onClick={() => navigate(`/student/exam/${examData.id}/review/${examData.studentSessionId}`)}
                  >
                    Xem lại bài làm
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* KHỐI ASSIGNMENT (GIỮ NGUYÊN BÊN DƯỚI) */}
        {activity.type === 'ASSIGNMENT' && (
          <>
            {!isAddingSubmission ? (
              <>
                {/* KHỐI TÍNH TOÁN TRẠNG THÁI KHÓA */}
                {(() => {
                  const isOverdue = activity.dueDate ? new Date() > new Date(activity.dueDate) : false;
                  const isLocked = activity.isLocked || (activity.lockAfterDueDate && isOverdue);

                  return (
                    <>
                      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316', borderRadius: '4px' }}>
                        <strong style={{ color: '#c2410c' }}>Hạn nộp bài:</strong> {activity.dueDate ? new Date(activity.dueDate).toLocaleString('vi-VN') : 'Không có hạn'}
                      </div>

                      {/* THÔNG BÁO BÀI TẬP ĐÃ BỊ KHÓA */}
                      {isLocked && (
                        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '6px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                          <FaLock size={16} />
                          Bài tập này đã bị khóa bởi Giảng viên. Bạn không thể nộp hoặc chỉnh sửa bài làm nữa.
                        </div>
                      )}

                      <h2 className="act-status-heading" style={{ color: '#f97316' }}>Trạng thái bài nộp của bạn</h2>
                      <table className="act-table">
                        <tbody>
                          <tr>
                            <th style={{ width: '30%' }}>Trạng thái bài nộp</th>
                            <td style={{ fontWeight: 'bold', color: submission ? '#16a34a' : '#64748b' }}>
                              {submission ? 'Đã nộp bài để chấm điểm' : 'Chưa nộp bài'}
                            </td>
                          </tr>

                          {submission && timeDiffStatus && (
                            <tr>
                              <th>Tình trạng nộp</th>
                              <td>
                                <div style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold',
                                  backgroundColor: timeDiffStatus.bgColor, color: timeDiffStatus.color, border: `1px solid ${timeDiffStatus.borderColor}`
                                }}>
                                  <FaClock /> {timeDiffStatus.text}
                                </div>
                              </td>
                            </tr>
                          )}

                          <tr>
                            <th>Trạng thái chấm điểm</th>
                            <td style={{ color: submission?.score ? '#16a34a' : '#64748b', fontWeight: 'bold' }}>
                              {submission?.score ? `Đã có điểm: ${submission.score}/10` : 'Chưa chấm điểm'}
                            </td>
                          </tr>

                          {submission && (
                            <tr>
                              <th>File đã nộp</th>
                              <td>
                                <a href={`${BACKEND_URL}${submission.fileUrl}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
                                  <FaFileAlt /> {extractFileName(submission.fileUrl)}
                                </a>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                                  Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                                </div>
                              </td>
                            </tr>
                          )}
                          {submission?.feedback && (
                            <tr>
                              <th>Nhận xét của giảng viên</th>
                              <td style={{ backgroundColor: '#f8fafc', fontStyle: 'italic', color: '#334155' }}>
                                "{submission.feedback}"
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                        {isLocked ? (
                          <button
                            className="act-btn"
                            disabled
                            style={{ backgroundColor: '#94a3b8', color: 'white', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}
                          >
                            <FaLock /> Đã khóa nộp bài
                          </button>
                        ) : (
                          <button
                            className="act-btn"
                            style={{ backgroundColor: '#f97316', fontSize: '16px' }}
                            onClick={() => setIsAddingSubmission(true)}
                          >
                            {submission ? 'Chỉnh sửa bài nộp' : 'Thêm bài nộp'}
                          </button>
                        )}

                        {submission && !submission.score && !isLocked && (
                          <button
                            className="act-btn"
                            style={{ backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={handleRemoveSubmission}
                          >
                            <FaTrashAlt /> Gỡ bỏ bài nộp
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                <h2 className="act-upload-section-title" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
                  <FaArrowDown size={16} color="#f97316" /> Tải file bài làm của bạn lên
                </h2>

                <div className="act-upload-container" style={{ marginTop: '20px' }}>
                  <div className="act-upload-dropzone-wrapper">
                    <div
                      className={`act-upload-dropzone ${isDragging ? 'drag-active' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={handleTriggerFileSelect}
                      style={{ border: '2px dashed #cbd5e1', padding: '40px', textAlign: 'center', cursor: 'pointer', borderRadius: '8px', backgroundColor: isDragging ? '#eff6ff' : '#f8fafc' }}
                    >
                      <div className="act-upload-icon-circle" style={{ backgroundColor: '#e0f2fe', color: '#3b82f6', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto' }}>
                        <FaFileUpload size={28} />
                      </div>
                      <div style={{ fontWeight: '600', color: '#334155', fontSize: '16px' }}>
                        {isDragging ? 'Thả file vào đây...' : 'Bấm để chọn file hoặc Kéo thả file vào đây'}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '5px' }}>Định dạng hỗ trợ: PDF, DOCX, ZIP, RAR... (Tối đa 10MB)</div>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCheckCircle size={20} />
                        <div>
                          <strong>Đã chọn file: </strong> {selectedFiles[0].name}
                          <div style={{ fontSize: '12px' }}>Sẵn sàng để nộp bài!</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="act-action-buttons" style={{ display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'center' }}>
                  <button
                    className="act-btn-save"
                    onClick={handleSaveSubmission}
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#f97316', color: 'white', padding: '12px 30px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Đang tải file lên...' : 'Lưu bài nộp'}
                  </button>
                  <button
                    className="act-btn-cancel"
                    onClick={() => { setIsAddingSubmission(false); setSelectedFiles([]); }}
                    style={{ backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', padding: '12px 30px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Huỷ bỏ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}