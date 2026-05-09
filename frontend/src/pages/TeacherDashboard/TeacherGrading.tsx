import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFileSignature, FaClock, FaChevronRight, FaFileAlt, FaStopwatch, FaLayerGroup, FaCheckCircle, FaInbox } from 'react-icons/fa';
import axiosClient from '../../api/axiosClient';

const formatDate = (dateString: string) => {
  if (!dateString) return 'Gần đây';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function TeacherGrading() {
  const navigate = useNavigate();
  const [groupedGrading, setGroupedGrading] = useState<{ [className: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  useEffect(() => {
    const fetchPendingGrading = async () => {
      setLoading(true);
      try {
        const classesRes = await axiosClient.get('/classes/my-classes');
        const myClasses = classesRes.data || [];
        
        let tempGrouped: { [key: string]: any[] } = {};
        let count = 0;

        await Promise.all(
          myClasses.map(async (cls: any) => {
            try {
              const res = await axiosClient.get(`/classes/${cls.id}/pending-submissions`);
              const submissions = res.data || [];
              
              if (submissions.length > 0) {
                const classKey = `${cls.subjectName} (${cls.classCode})`;

                const formatted = submissions.map((sub: any) => ({
                  id: sub.id,
                  type: sub.type,
                  studentName: sub.studentName || 'Sinh viên',
                  activityTitle: sub.activityTitle || 'Bài nộp',
                  activityId: sub.activityId,
                  examId: sub.examId,
                  submittedAt: formatDate(sub.submittedAt),
                  classId: cls.id,
                  rawDate: sub.submittedAt
                }));
                
                formatted.sort((a: any, b: any) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

                tempGrouped[classKey] = formatted;
                count += formatted.length;
              }
            } catch (err) {}
          })
        );

        setGroupedGrading(tempGrouped);
        setTotalSubmissions(count);
      } catch (error) {
        console.error("Lỗi khi tải bài tập chờ chấm:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingGrading();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#64748b' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '15px' }}></div>
        <p>Đang tìm kiếm bài nộp chờ chấm...</p>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* HEADER SECTION */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', 
        marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' 
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#f59e0b', padding: '10px', borderRadius: '12px', display: 'flex' }}>
              <FaFileSignature color="white" size={24}/>
            </div>
            Danh sách chờ chấm điểm
          </h1>
          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '15px' }}>
            Tổng hợp tất cả bài thi và bài tập cần bạn chấm điểm từ các lớp học.
          </p>
        </div>
        
        <div style={{ 
          backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 20px', 
          borderRadius: '12px', textAlign: 'right' 
        }}>
          <div style={{ fontSize: '13px', color: '#d97706', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đang chờ</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#92400e' }}>{totalSubmissions} Bài nộp</div>
        </div>
      </div>

      {totalSubmissions === 0 ? (
        <div style={{ 
          textAlign: 'center', padding: '80px 40px', backgroundColor: 'white', 
          borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
        }}>
          <div style={{ fontSize: '64px', color: '#10b981', marginBottom: '20px' }}><FaInbox /></div>
          <h2 style={{ color: '#0f172a', marginBottom: '8px' }}>Tất cả đã hoàn thành!</h2>
          <p style={{ color: '#64748b' }}>Không còn bài nộp nào đang chờ bạn chấm điểm lúc này.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(groupedGrading).map(([className, submissions]) => (
            <div key={className}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <FaLayerGroup color="#6366f1" size={18} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Lớp: {className}</h3>
                <div style={{ height: '1px', flex: 1, backgroundColor: '#e2e8f0' }}></div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{submissions.length} bài nộp</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {submissions.map((item) => {
                  const isExam = item.type === 'EXAM';
                  const navigateUrl = isExam 
                    ? `/teacher/exam/${item.examId}/grading` 
                    : `/teacher/activity/${item.activityId}/grading`;

                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '16px 20px', 
                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.2s ease', cursor: 'default',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = isExam ? '#fca5a5' : '#fbbf24';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div style={{ 
                          width: '48px', height: '48px', borderRadius: '12px', 
                          backgroundColor: isExam ? '#fef2f2' : '#fffbeb', 
                          color: isExam ? '#ef4444' : '#d97706',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                        }}>
                          {isExam ? <FaStopwatch /> : <FaFileAlt />}
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ 
                              backgroundColor: isExam ? '#ef4444' : '#3b82f6', 
                              color: 'white', padding: '2px 8px', borderRadius: '6px', 
                              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase'
                            }}>
                              {isExam ? 'Bài thi' : 'Bài tập'}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>{item.activityTitle}</h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '14px', color: '#475569' }}>
                              Sinh viên: <strong style={{ color: '#0f172a' }}>{item.studentName}</strong>
                            </span>
                            <span style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaClock /> {item.submittedAt}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => navigate(navigateUrl)} 
                        style={{ 
                          padding: '10px 20px', 
                          backgroundColor: isExam ? '#ef4444' : '#0f172a', 
                          color: 'white', border: 'none', borderRadius: '8px', 
                          fontSize: '13px', fontWeight: 700, cursor: 'pointer', 
                          display: 'flex', alignItems: 'center', gap: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        Chấm ngay <FaChevronRight size={10}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
