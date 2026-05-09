import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus, FaUserFriends, FaClock, FaChevronRight, FaLayerGroup } from 'react-icons/fa';
import axiosClient from '../../api/axiosClient';

const formatDate = (dateString: string) => {
  if (!dateString) return 'Gần đây';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function TeacherApprovals() {
  const navigate = useNavigate();
  // Thay vì lưu 1 mảng phẳng, ta lưu Object (Dictionary) đã được nhóm theo Lớp học
  const [groupedApprovals, setGroupedApprovals] = useState<{ [className: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      setLoading(true);
      try {
        const classesRes = await axiosClient.get('/classes/my-classes');
        const myClasses = classesRes.data || [];

        let tempGrouped: { [key: string]: any[] } = {};
        let count = 0;

        await Promise.all(
          myClasses.map(async (cls: any) => {
            try {
              const pendingRes = await axiosClient.get(`/classes/${cls.id}/pending-requests`);
              const pendingStudents = pendingRes.data || [];
              
              if (pendingStudents.length > 0) {
                // Tạo một key là Tên Lớp (kèm Mã lớp)
                const classKey = `${cls.subjectName} (${cls.classCode})`;
                
                const formattedRequests = pendingStudents.map((req: any) => ({
                  id: req._id || req.id || Math.random().toString(), 
                  studentName: req.student?.fullName || req.fullName || 'Sinh viên ẩn danh',
                  email: req.student?.email || req.email || 'Chưa cập nhật',
                  date: formatDate(req.enrolledAt || req.createdAt),
                  classId: cls.id
                }));

                tempGrouped[classKey] = formattedRequests;
                count += formattedRequests.length;
              }
            } catch (err) {
              console.error(`Không thể lấy yêu cầu duyệt cho lớp ${cls.id}:`, err);
            }
          })
        );

        setGroupedApprovals(tempGrouped);
        setTotalRequests(count);
      } catch (error) {
        console.error("Lỗi khi tải danh sách chờ duyệt:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingApprovals();
  }, []);

  if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Đang tải yêu cầu duyệt...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <header className="td-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{margin:0, display: 'flex', alignItems: 'center', gap: '10px'}}><FaUserPlus color="#ef4444"/> Yêu cầu duyệt vào lớp</h1>
          <p style={{marginTop:'5px', color:'#64748b'}}>Bạn có tổng cộng <strong>{totalRequests}</strong> yêu cầu đang chờ duyệt.</p>
        </div>
      </header>

      {totalRequests === 0 ? (
        <div className="dash-box" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Tuyệt vời! Không có yêu cầu nào đang chờ duyệt.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lặp qua từng nhóm (Từng Lớp) */}
          {Object.entries(groupedApprovals).map(([className, requests]) => (
            <div key={className} className="dash-box" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                  <FaLayerGroup color="#2563eb" /> Lớp: {className}
                </h3>
                <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                  {requests.length} yêu cầu
                </span>
              </div>
              
              <div className="course-list">
                {requests.map((req) => (
                  <div key={req.id} className="course-item" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 15px', borderRadius: '8px' }}>
                    <div className="c-icon" style={{backgroundColor: '#e2e8f0', color: '#64748b'}}><FaUserFriends /></div>
                    <div className="c-info">
                      <h4 style={{ fontSize: '15px', margin: '0 0 4px 0' }}>{req.studentName}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{req.email}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><FaClock /> {req.date}</span>
                      <button 
                        onClick={() => navigate(`/teacher/class/${req.classId}`)} 
                        style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        Vào lớp xử lý <FaChevronRight size={10}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}