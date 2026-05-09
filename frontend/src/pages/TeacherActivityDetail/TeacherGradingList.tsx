import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaChevronLeft, FaFileDownload, FaUserEdit, FaCheckCircle, FaClock, FaHome, FaChevronRight, FaTimesCircle, FaTimes, FaCheckSquare } from 'react-icons/fa';
import axiosClient from '../../api/axiosClient';
import './TeacherGrading.css'; 

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ==========================================
// HÀM TÍNH TOÁN THỜI GIAN NỘP SỚM / TRỄ
// ==========================================
const getTimeDiffStatus = (submittedAt: string, dueDate: string | null) => {
  if (!dueDate || !submittedAt) return null;

  const subTime = new Date(submittedAt).getTime();
  const dueTime = new Date(dueDate).getTime();
  const diffMs = subTime - dueTime;
  const absDiff = Math.abs(diffMs);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  let timeStr = '';
  if (days > 0) timeStr += `${days} ngày `;
  if (hours > 0) timeStr += `${hours} giờ `;
  if (minutes > 0 || timeStr === '') timeStr += `${minutes} phút`;

  if (diffMs > 0) {
    return {
      text: `Nộp trễ ${timeStr}`,
      color: '#b91c1c', 
      bgColor: '#fef2f2', 
      borderColor: '#fca5a5' 
    };
  } else {
    return {
      text: `Nộp sớm ${timeStr}`,
      color: '#15803d', 
      bgColor: '#f0fdf4', 
      borderColor: '#86efac' 
    };
  }
};

export default function TeacherGradingList() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any>(null);

  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });

  // STATES CHO PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // ==========================================
  // STATE QUẢN LÝ MODAL THÔNG BÁO CHUNG
  // ==========================================
  const [appModal, setAppModal] = useState({
    isOpen: false,
    isConfirm: false, // Quyết định xem có nút Hủy bỏ hay không
    isSuccess: false, // Màu Xanh hay Màu Đỏ
    title: '',
    message: '',
    confirmText: 'Đóng',
    onConfirm: () => {}
  });

  const closeModal = () => setAppModal(prev => ({ ...prev, isOpen: false }));

  const fetchData = async () => {
    try {
      const [actRes, subRes] = await Promise.all([
        axiosClient.get(`/activities/${id}`),
        axiosClient.get(`/activities/${id}/submissions`)
      ]);
      setActivity(actRes.data);
      setData(subRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const openGradeModal = (sub: any) => {
    setSelectedSub(sub);
    setGradeForm({
      score: sub.submission?.score?.toString() || '',
      feedback: sub.submission?.feedback || ''
    });
  };

  const handleSaveGrade = async () => {
    if (gradeForm.score === '') {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Cảnh báo', message: 'Vui lòng nhập điểm số trước khi lưu!',
        confirmText: 'Đã hiểu', onConfirm: closeModal
      });
      return;
    }

    try {
      await axiosClient.patch(`/activities/submissions/${selectedSub.submission.id}/grade`, {
        score: parseFloat(gradeForm.score),
        feedback: gradeForm.feedback
      });
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: true,
        title: 'Thành công', message: 'Đã lưu điểm và nhận xét thành công!',
        confirmText: 'Tuyệt vời', onConfirm: closeModal
      });
      setSelectedSub(null);
      fetchData();
    } catch (error) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Lỗi', message: 'Có lỗi xảy ra khi chấm điểm, vui lòng thử lại!',
        confirmText: 'Đóng', onConfirm: closeModal
      });
    }
  };

  // CHỨC NĂNG CHẤM 0Đ HÀNG LOẠT
  const handleBulkGradeZero = async () => {
    const unsubmittedCount = data.filter(item => !item.submission).length;
    
    if (unsubmittedCount === 0) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: true,
        title: 'Thông báo', message: 'Tuyệt vời! Tất cả sinh viên đã nộp bài hoặc đã có điểm!',
        confirmText: 'Đóng', onConfirm: closeModal
      });
      return;
    }

    // Modal Xác nhận thay cho window.confirm
    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false,
      title: 'Xác nhận chấm điểm', 
      message: `Bạn có chắc chắn muốn chấm 0 điểm cho ${unsubmittedCount} sinh viên CHƯA NỘP BÀI? Hành động này sẽ tạo dữ liệu điểm 0 trên hệ thống.`,
      confirmText: 'Xác nhận chấm 0đ', 
      onConfirm: async () => {
        try {
          await axiosClient.post(`/activities/${id}/bulk-zero`);
          setAppModal({
            isOpen: true, isConfirm: false, isSuccess: true,
            title: 'Thành công', message: `Đã chấm 0 điểm thành công cho ${unsubmittedCount} sinh viên!`,
            confirmText: 'Đóng', onConfirm: closeModal
          });
          fetchData(); 
        } catch (error) {
          setAppModal({
            isOpen: true, isConfirm: false, isSuccess: false,
            title: 'Lỗi mạng', message: 'Lỗi khi chấm điểm hàng loạt! Vui lòng kiểm tra lại kết nối.',
            confirmText: 'Đóng', onConfirm: closeModal
          });
        }
      }
    });
  };

  // LOGIC PHÂN TRANG
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginatedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) return <div className="loader">Đang tải danh sách bài nộp...</div>;

  return (
    <div className="act-container">
      
      {/* ========================================== */}
      {/* MODAL THÔNG BÁO & XÁC NHẬN CHUNG */}
      {/* ========================================== */}
      {appModal.isOpen && (
        <div className="td-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="td-modal-content" style={{ maxWidth: '400px' }}>
            <div className="td-modal-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '15px' }}>
              <h2 style={{ color: appModal.isSuccess ? '#16a34a' : '#dc2626', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {appModal.isSuccess ? <FaCheckSquare /> : <FaTimesCircle />} {appModal.title}
              </h2>
              <button className="td-modal-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="td-modal-body" style={{ paddingTop: '20px' }}>
              <p style={{ color: '#475569', lineHeight: '1.5', marginBottom: '25px' }}>{appModal.message}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {appModal.isConfirm && (
                  <button className="td-btn-cancel" onClick={closeModal}>Hủy bỏ</button>
                )}
                <button 
                  className="td-btn-submit" 
                  style={{ backgroundColor: appModal.isSuccess ? '#16a34a' : '#dc2626' }} 
                  onClick={appModal.onConfirm}
                >
                  {appModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="act-breadcrumb-wrapper">
        <div className="act-breadcrumb">
          <Link to="/teacher-dashboard" className="act-breadcrumb-item"><FaHome /> Bảng điều khiển</Link>
          <FaChevronRight size={10} style={{margin: '0 10px'}}/>
          <span className="act-breadcrumb-item" onClick={() => navigate(-1)} style={{cursor: 'pointer'}}>
            Lớp {activity?.section?.class?.classCode}
          </span>
          <FaChevronRight size={10} style={{margin: '0 10px'}}/>
          <div className="act-breadcrumb-active">Chấm điểm: {activity?.title}</div>
        </div>
      </div>

      <div className="act-main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="act-title-text" style={{fontSize: '24px', margin: 0}}>Danh sách chấm bài ({data.length} SV)</h1>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="act-btn"
              onClick={handleBulkGradeZero} 
              style={{backgroundColor: '#ef4444', color: 'white', padding: '8px 15px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'}}
            >
              <FaTimesCircle /> Chấm 0đ (Chưa nộp)
            </button>
            <button className="act-btn" onClick={() => navigate(-1)} style={{backgroundColor: '#64748b'}}>
              <FaChevronLeft /> Quay lại
            </button>
          </div>
        </div>

        <div className="grading-table-container">
          <table className="grading-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Thời gian nộp</th>
                <th>Tệp bài làm</th>
                <th>Điểm</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
           <tbody>
              {paginatedData.map((item, idx) => {
                // SỬA LỖI: Chỉ gọi hàm tính thời gian khi thực sự có file bài nộp
                const hasFile = item.submission && item.submission.fileUrl && item.submission.fileUrl.trim() !== '';
                const timeDiffStatus = hasFile && activity?.dueDate 
                  ? getTimeDiffStatus(item.submission.submittedAt, activity.dueDate) 
                  : null;

                return (
                  <tr key={idx}>
                    <td>
                      <div style={{fontWeight: 'bold'}}>{item.student.fullName}</div>
                      <div style={{fontSize: '12px', color: '#94a3b8'}}>{item.student.email}</div>
                    </td>
                    
                    {/* SỬA LỖI Ở CỘT THỜI GIAN NỘP */}
                    <td>
                      {hasFile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          <span>{new Date(item.submission.submittedAt).toLocaleString('vi-VN')}</span>
                          {timeDiffStatus && (
                            <div style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '4px', 
                              padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                              backgroundColor: timeDiffStatus.bgColor, color: timeDiffStatus.color, border: `1px solid ${timeDiffStatus.borderColor}`
                            }}>
                              <FaClock /> {timeDiffStatus.text}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{color: '#475569', fontStyle: 'italic'}}>Chưa nộp</span>
                      )}
                    </td>

                    <td>
                      {hasFile ? (
                        <a href={`${BACKEND_URL}${item.submission.fileUrl}`} target="_blank" rel="noreferrer" className="download-link">
                          <FaFileDownload /> Tải bài làm
                        </a>
                      ) : <span style={{color: '#475569',fontStyle: 'italic'}}>Chưa nộp</span>}
                    </td>
                    <td>
                      {item.submission?.score !== null && item.submission?.score !== undefined ? (
                        <strong style={{color: item.submission?.score < 5 ? '#ef4444' : '#2563eb', fontSize: '16px'}}>
                          {item.submission?.score} / 10
                        </strong>
                      ) : '---'}
                    </td>
                    <td>
                      {!item.submission ? (
                        <span className="status-badge error">Chưa nộp</span>
                      ) : item.submission.score !== null ? (
                        <span className="status-badge success">Đã chấm điểm</span>
                      ) : (
                        <span className="status-badge warning">Chưa chấm điểm</span>
                      )}
                    </td>
                    <td>
                      {/* Cho phép chấm/sửa điểm kể cả khi chưa nộp để gv có thể nhập 0 tay */}
                      <button className="grade-btn" onClick={() => openGradeModal(item)}>
                        <FaUserEdit /> {item.submission?.score !== null && item.submission?.score !== undefined ? 'Sửa điểm' : 'Chấm điểm'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* THANH PHÂN TRANG */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            ><FaChevronLeft size={12} /></button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i} onClick={() => setCurrentPage(i + 1)}
                style={{
                  padding: '8px 14px', borderRadius: '6px', border: '1px solid',
                  borderColor: currentPage === i + 1 ? '#2563eb' : '#e2e8f0',
                  backgroundColor: currentPage === i + 1 ? '#2563eb' : 'white',
                  color: currentPage === i + 1 ? 'white' : '#1e293b', fontWeight: 'bold', cursor: 'pointer'
                }}
              >{i + 1}</button>
            ))}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            ><FaChevronRight size={12} /></button>
          </div>
        )}

      </div>

      {/* MODAL CHẤM ĐIỂM (CÁ NHÂN) */}
      {selectedSub && (
        <div className="td-modal-overlay">
          <div className="td-modal-content" style={{maxWidth: '500px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden'}}>
            
            <div className="td-modal-header" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Chấm bài: {selectedSub.student.fullName}</h2>
            </div>

            <div className="td-modal-body" style={{ padding: '20px' }}>
              <div className="td-form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>Điểm số (Thang điểm 10)</label>
                <input 
                  type="number" step="0.1" min="0" max="10"
                  value={gradeForm.score} 
                  onChange={e => {
                    let val = e.target.value;
                    if (val !== '') {
                      const num = parseFloat(val);
                      if (num > 10) val = '10';
                      if (num < 0) val = '0';
                    }
                    setGradeForm({...gradeForm, score: val});
                  }}
                  className="grade-input-field"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px' }}
                />
              </div>
              
              <div className="td-form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>Nhận xét</label>
                <textarea 
                  rows={5}
                  value={gradeForm.feedback}
                  onChange={e => setGradeForm({...gradeForm, feedback: e.target.value})}
                  placeholder="Nhập lời phê cho sinh viên..."
                  className="grade-textarea-field"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div className="td-modal-footer" style={{ padding: '15px 20px 25px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="td-btn-cancel" 
                onClick={() => setSelectedSub(null)}
                style={{ padding: '10px 20px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button 
                className="td-btn-submit" 
                onClick={handleSaveGrade}
                style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Lưu kết quả
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}