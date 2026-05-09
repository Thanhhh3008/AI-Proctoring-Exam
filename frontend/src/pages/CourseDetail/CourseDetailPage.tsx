import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaBookOpen, FaUsers, FaChartBar, FaAward, FaChevronDown, 
  FaChevronUp, FaGlobe, FaFileAlt, FaFileUpload, FaCheckSquare, 
  FaHome, FaChevronRight, FaPlayCircle, FaInfoCircle, FaChalkboardTeacher,FaUserFriends,
  FaSearch, FaDownload, FaChevronLeft, FaStar, FaQuoteLeft, FaPaperPlane
} from 'react-icons/fa';
import html2canvas from 'html2canvas'; 
import './CourseDetailPage.css'; 
import axiosClient from '../../api/axiosClient';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getActivityDisplayProps = (type: string) => {
  switch (type) {
    case 'FILE': return { typeName: 'TÀI LIỆU', icon: <FaFileAlt size={20} />, color: '#0ea5e9', isAIExam: false }; 
    case 'URL': return { typeName: 'LIÊN KẾT', icon: <FaGlobe size={20} />, color: '#8b5cf6', isAIExam: false }; 
    case 'ASSIGNMENT': return { typeName: 'BÀI TẬP', icon: <FaFileUpload size={20} />, color: '#10b981', isAIExam: false }; 
    case 'EXAM': return { typeName: 'BÀI KIỂM TRA', icon: <FaCheckSquare size={20} />, color: '#f43f5e', isAIExam: true }; 
    default: return { typeName: 'HỌC LIỆU', icon: <FaFileAlt size={20} />, color: '#64748b', isAIExam: false };
  }
};

const formatScore = (score: number | string | null | undefined) => {
  if (score === null || score === undefined || score === '--') return '--';
  const num = parseFloat(score.toString());
  if (isNaN(num)) return '--';
  return num.toFixed(1);
};

export default function CourseDetailPage() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('khoahoc');
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Phân trang thành viên
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [gradesData, setGradesData] = useState<any>(null);

  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // State Đánh giá
  const [reviewsData, setReviewsData] = useState({ reviews: [], avgRating: 0, total: 0, myReview: null });
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const getUserFromStorage = () => {
    const name = localStorage.getItem('fullName');
    return name && name !== "undefined" ? name : "Người dùng EduExam";
  };
  const studentName = getUserFromStorage();
useEffect(() => {
    setLoading(true);
    setCourseInfo(null);
    setSections([]);
    setMembers([]);
    setGradesData(null);
    setReviewsData({ reviews: [], avgRating: 0, total: 0, myReview: null });
    setActiveTab('khoahoc'); // Quay về tab mặc định
  }, [id]);

  // Load Course
  useEffect(() => {
    const fetchContent = async () => {
      try {
        if (!id) return;
        const response = await axiosClient.get(`/classes/${id}/studentclass`);
        setCourseInfo(response.data.course);
        const formattedSections = response.data.sections.map((sec: any) => ({ ...sec, isOpen: true }));
        setSections(formattedSections);
      } catch (error) {
        console.error('Lỗi tải nội dung khóa học:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [id]);

  // Load Members
  useEffect(() => {
    const fetchMembers = async () => {
      if (activeTab === 'thanhvien' && members.length === 0) {
        setLoadingMembers(true);
        try {
          const res = await axiosClient.get(`/classes/${id}/members`);
          setMembers(res.data);
        } catch (error) {
          console.error("Lỗi lấy thành viên:", error);
        } finally {
          setLoadingMembers(false);
        }
      }
    };
    fetchMembers();
  }, [activeTab, id, members.length]);

  // Load Grades
  useEffect(() => {
    const fetchGrades = async () => {
      if (!gradesData) {
        try {
          const res = await axiosClient.get(`/classes/${id}/my-grades`);
          setGradesData(res.data);
        } catch (error) {
          console.error("Lỗi lấy điểm số/tiến độ:", error);
        }
      }
    };
    fetchGrades();
  }, [id, gradesData]);

  // Load Reviews
  useEffect(() => {
    if (activeTab === 'danhgia' && id) {
      fetchReviews();
    }
  }, [activeTab, id]);

  const fetchReviews = async () => {
    try {
      const res = await axiosClient.get(`/classes/${id}/reviews`);
      setReviewsData(res.data);
      if (res.data.myReview) {
        setRatingInput(res.data.myReview.rating);
        setCommentInput(res.data.myReview.comment || '');
      }
    } catch (err) {
      console.error("Lỗi lấy đánh giá", err);
    }
  };

  const toggleSection = (sectionId: string) => {
    setSections(sections.map(sec => sec.id === sectionId ? { ...sec, isOpen: !sec.isOpen } : sec));
  };

  const collapseAll = () => setSections(sections.map(sec => ({ ...sec, isOpen: false })));

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + pageSize);

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `Chung_Nhan_${courseInfo?.subjectName}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error("Lỗi khi tạo chứng nhận:", err);
      alert("Có lỗi xảy ra khi tạo chứng nhận. Vui lòng thử lại!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return alert("Vui lòng nhập nội dung đánh giá");
    
    setSubmittingReview(true);
    try {
      await axiosClient.post(`/classes/${id}/reviews`, {
        rating: ratingInput,
        comment: commentInput
      });
      alert("Đã ghi nhận đánh giá của bạn!");
      fetchReviews(); 
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi gửi đánh giá");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="student-loading">Đang tải không gian học tập...</div>;

  const isCompleted = courseInfo?.status === 'COMPLETED';
  const rawPercentage = gradesData?.progress?.percentage || 0;
  const progressPercentage = isCompleted ? 100 : rawPercentage;

  return (
    <div className="student-course-container">
      
      <div className="sc-header-banner">
        <div className="sc-banner-inner">
          <div className="sc-breadcrumb">
            <Link to="/dashboard" className="sc-breadcrumb-link"><FaHome /> Lớp của tôi</Link>
            <FaChevronRight size={10} className="sc-breadcrumb-icon" /> 
            <span>Không gian học tập</span>
          </div>
          <h1 className="sc-title">{courseInfo?.subjectName || "Đang tải dữ liệu..."}</h1>
          <p className="sc-subtitle">Chào mừng bạn đến với lớp học. Hãy hoàn thành các bài giảng để đạt kết quả tốt nhất!</p>
        </div>
      </div>

      <div className="sc-layout-wrapper">
        <div className="sc-main-column">
          
          <div className="sc-tabs-box">
            {[
              { id: 'khoahoc', label: 'Lộ trình học', icon: <FaBookOpen /> },
              { id: 'thanhvien', label: 'Thành viên', icon: <FaUsers /> },
              { id: 'diemso', label: 'Kết quả', icon: <FaChartBar /> },
              { id: 'nangluc', label: 'Chứng nhận', icon: <FaAward /> },
              { id: 'danhgia', label: 'Đánh giá', icon: <FaStar /> },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`sc-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: LỘ TRÌNH HỌC */}
          {activeTab === 'khoahoc' && (
            <div className="sc-fade-in">
              <div className="sc-action-bar">
                <h2 className="sc-section-heading">Nội dung chi tiết</h2>
                <button onClick={collapseAll} className="sc-btn-collapse">Thu gọn tất cả</button>
              </div>

              {sections.length === 0 ? (
                <div className="sc-empty-state">
                  <img src="/images/empty-learning.svg" alt="" style={{ width: '120px', opacity: 0.3, marginBottom: '15px' }} />
                  <h3>Chưa có bài giảng nào</h3>
                  <p>Giảng viên đang trong quá trình cập nhật nội dung.</p>
                </div>
              ) : (
                sections.map((section, index) => (
                  <div key={section.id} className="sc-module-card">
                    <div onClick={() => toggleSection(section.id)} className={`sc-module-header ${section.isOpen ? 'open' : ''}`}>
                      <div className="sc-module-info">
                        <span className="sc-module-number">Chương {index + 1}</span>
                        <h3 className="sc-module-title">{section.title}</h3>
                      </div>
                      <div className="sc-module-toggle">
                        {section.isOpen ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>

                    {section.isOpen && (
                      <div className="sc-module-body">
                        {section.activities.length === 0 ? (
                           <p className="sc-no-activity">Mục này chưa có tài liệu đính kèm.</p>
                        ) : (
                          section.activities?.filter((act: any) => !act.isHidden).map((activity: any) => {
                            const display = getActivityDisplayProps(activity.type);
                            return (
                              <div key={activity.id} className="sc-activity-row" onClick={() => navigate(`/activity/${activity.id}`)}>
                                <div className="sc-activity-icon" style={{ backgroundColor: `${display.color}15`, color: display.color }}>
                                  {display.icon}
                                </div>
                                <div className="sc-activity-content">
                                  <div className="sc-activity-title" style={{ color: display.isAIExam ? '#e11d48' : '#1e293b' }}>
                                    {activity.title}
                                  </div>
                                  <div className="sc-activity-type" style={{ color: '#64748b' }}>{display.typeName}</div>
                                </div>
                                <div className="sc-activity-action">
                                  {display.isAIExam ? (
                                    <button className="sc-btn-exam" onClick={(e) => { e.stopPropagation(); navigate(`/activity/${activity.id}`); }}>
                                      Làm bài
                                    </button>
                                  ) : (
                                    <FaPlayCircle className="sc-icon-play" size={24} />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: THÀNH VIÊN */}
          {activeTab === 'thanhvien' && (
            <div className="sc-fade-in" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>
                  Thành viên lớp học <span style={{ color: '#64748b', fontSize: '15px', fontWeight: 'normal' }}>({members.length} người)</span>
                </h2>
                
                <div style={{ position: 'relative', width: '250px' }}>
                  <FaSearch style={{ position: 'absolute', top: '10px', left: '12px', color: '#94a3b8' }} />
                  <input 
                    type="text" placeholder="Tìm kiếm sinh viên..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 35px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              </div>

              {loadingMembers ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải danh sách...</div>
              ) : (
                <>
                  <div className="sc-members-list">
                    {paginatedMembers.length > 0 ? (
                      paginatedMembers.map((member, index) => {
                        const isTeacher = member.role === 'TEACHER';
                        const badgeBg = isTeacher ? '#dbeafe' : '#f1f5f9';
                        const badgeColor = isTeacher ? '#2563eb' : '#475569';
                        const roleText = isTeacher ? 'Giảng viên' : 'Sinh viên';

                        return (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                              {member.avatarUrl ? (
                                <img src={`${BACKEND_URL}${member.avatarUrl}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#64748b' }}>{member.fullName.charAt(0)}</span>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {member.fullName}
                                {isTeacher && (
                                  <span style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: badgeBg, color: badgeColor, borderRadius: '12px', fontWeight: 'bold', border: `1px solid ${isTeacher ? '#bfdbfe' : '#e2e8f0'}`}}>
                                    {roleText}
                                  </span>
                                )}
                              </h4>
                              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{member.email}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Không tìm thấy thành viên nào.</div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '25px' }}>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <FaChevronLeft size={12} />
                      </button>

                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: currentPage === i + 1 ? '#2563eb' : '#e2e8f0',
                            backgroundColor: currentPage === i + 1 ? '#2563eb' : 'white',
                            color: currentPage === i + 1 ? 'white' : '#1e293b',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                      >
                        <FaChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: ĐIỂM SỐ */}
          {activeTab === 'diemso' && (
            <div className="sc-fade-in" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaChartBar color="#3b82f6" /> Kết quả học tập
                </h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>
                  Nhấn vào tên bài tập/bài thi để xem chi tiết yêu cầu và nhận xét.
                </p>
              </div>

              {!gradesData || gradesData.gradesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>Chưa có bài tập hoặc bài kiểm tra nào trong khóa học này.</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '15px', color: '#475569', fontWeight: 600 }}>Tên hoạt động</th>
                          <th style={{ padding: '15px', color: '#475569', fontWeight: 600, width: '120px' }}>Trọng số</th>
                          <th style={{ padding: '15px', color: '#475569', fontWeight: 600, width: '150px' }}>Điểm số</th>
                          <th style={{ padding: '15px', color: '#475569', fontWeight: 600, width: '180px' }}>Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradesData.gradesList.map((gradeInfo: any, index: number) => {
                          const display = getActivityDisplayProps(gradeInfo.activityType);
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => navigate(`/activity/${gradeInfo.activityId}`)}>
                              <td style={{ padding: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ color: display.color, display: 'flex' }}>{display.icon}</span>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{gradeInfo.activityTitle}</div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{display.typeName}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '15px' }}>
                                <span style={{ backgroundColor: '#e0f2fe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>{gradeInfo.weight}%</span>
                              </td>
                              <td style={{ padding: '15px' }}>
                                {gradeInfo.score !== null ? <strong style={{ color: '#16a34a', fontSize: '16px' }}>{formatScore(gradeInfo.score)} / 10.0</strong> : <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>--</span>}
                              </td>
                              <td style={{ padding: '15px' }}>
                                {gradeInfo.hasFeedback ? <span style={{ color: '#2563eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}><FaFileAlt /> Có nhận xét</span> : <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Không có</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {gradesData.summary && (
                    <div style={{ marginTop: '25px', padding: '25px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '18px' }}>Tổng kết môn học</h3>
                        <div style={{ display: 'flex', gap: '20px', color: '#64748b', fontSize: '14px' }}>
                          <span style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Trung bình Bài tập: <strong style={{ color: '#1e293b' }}>{formatScore(gradesData.summary.avgAssignment)}</strong></span>
                          <span style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Trung bình Bài thi: <strong style={{ color: '#1e293b' }}>{formatScore(gradesData.summary.avgExam)}</strong></span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '25px', backgroundColor: 'white', padding: '15px 25px', borderRadius: '8px', border: `2px solid ${gradesData.summary.statusColor}30`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Điểm hệ 10</div>
                          <div style={{ fontSize: '32px', fontWeight: '900', color: gradesData.summary.statusColor, lineHeight: '1.2' }}>{formatScore(gradesData.summary.finalScore)}</div>
                        </div>
                        <div style={{ width: '2px', height: '50px', backgroundColor: '#e2e8f0' }}></div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Điểm Chữ</div>
                          <div style={{ fontSize: '32px', fontWeight: '900', color: gradesData.summary.statusColor, lineHeight: '1.2' }}>{gradesData.summary.letterGrade}</div>
                          <div style={{ fontSize: '11px', color: 'white', fontWeight: 'bold', backgroundColor: gradesData.summary.statusColor, padding: '3px 10px', borderRadius: '12px', marginTop: '2px', display: 'inline-block' }}>{gradesData.summary.statusText}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {gradesData.summary && (
                    <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FaInfoCircle /> Hướng dẫn tính điểm:</strong>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li><strong>Điểm hệ 10</strong> = (Trung bình Bài tập × 30%) + (Trung bình Bài thi × 70%). <em>(Lưu ý: Hệ thống chỉ tính trên các bài bạn đã có điểm)</em></li>
                        <li><strong>Thang điểm chữ:</strong> A (Giỏi: 8.5 - 10), B (Khá: 7.0 - 8.4), C (Trung bình: 5.5 - 6.9), D (Yếu: 4.0 - 5.4), F (Trượt: Dưới 4.0).</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: CHỨNG NHẬN (CẬP NHẬT THEO MẪU COURSERA) */}
          {activeTab === 'nangluc' && (
            <div className="sc-fade-in" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <FaAward size={50} color="#f59e0b" style={{ marginBottom: '15px' }} />
                <h2 style={{ fontSize: '24px', color: '#1e293b', margin: '0 0 10px 0' }}>Chứng nhận hoàn thành khóa học</h2>
                
                {courseInfo?.status !== 'COMPLETED' ? (
                  <p style={{ color: '#64748b', fontSize: '16px' }}>Khóa học vẫn đang diễn ra. Bạn sẽ nhận được chứng nhận sau khi Giảng viên kết thúc khóa học này.</p>
                ) : (!gradesData?.summary || gradesData.summary.finalScore < 4.0) ? (
                  <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: 'bold' }}>Rất tiếc! Điểm tổng kết của bạn chưa đạt yêu cầu (Dưới 4.0) để được cấp chứng nhận.</p>
                ) : (
                  <>
                    <p style={{ color: '#16a34a', fontSize: '16px', fontWeight: 'bold' }}>Chúc mừng! Bạn đã hoàn thành xuất sắc khóa học này.</p>
                    
                    <button 
                      onClick={handleDownloadCertificate}
                      disabled={isDownloading}
                      style={{ 
                        marginTop: '15px', backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', 
                        borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '10px', transition: 'background 0.3s'
                      }}
                    >
                      <FaDownload /> {isDownloading ? 'Đang tạo ảnh...' : 'Tải xuống Chứng Nhận (.PNG)'}
                    </button>

                    {/* VÙNG GIAO DIỆN CHỨNG NHẬN CLONE MẪU COURSERA */}
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
                      
                      {/* Container chính của chứng chỉ (Ref để tải ảnh) */}
                      <div 
                        ref={certificateRef}
                        style={{ 
                          width: '850px', height: '620px', 
                          backgroundColor: '#F1F5F9',
                          padding: '15px', position: 'relative', 
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                          fontFamily: '"Times New Roman", Times, serif',
                          color: '#222',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Viền kép mỏng bên ngoài */}
                        <div style={{ 
                          border: '2px solid #888', 
                          width: '100%', height: '100%', 
                          position: 'relative', padding: '40px', 
                          boxSizing: 'border-box', zIndex: 1 
                        }}>
                          
                          {/* 4 ô vuông họa tiết ở 4 góc viền */}
                          <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', backgroundColor: '#fdfdfb', border: '2px solid #888' }}></div>
                          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#fdfdfb', border: '2px solid #888' }}></div>
                          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '8px', height: '8px', backgroundColor: '#fdfdfb', border: '2px solid #888' }}></div>
                          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#fdfdfb', border: '2px solid #888' }}></div>

                          {/* Pattern chìm trang trí nền (Guilloche effect mờ) */}
                          <div style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, zIndex: 0, pointerEvents: 'none',
                            backgroundImage: 'repeating-radial-gradient(circle at center, transparent 0, transparent 20px, #000 21px, transparent 22px)' 
                          }}></div>

                          {/* ================= CỘT DẢI RUY BĂNG BÊN PHẢI ================= */}
                          <div style={{ 
                            position: 'absolute', top: 0, right: '60px', 
                            width: '150px', height: '480px', 
                            backgroundColor: '#e2e6ea', /* Màu xám ruy băng */
                            zIndex: 1, 
                            borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1',
                            /* Cắt đuôi nhọn cho ruy băng */
                            clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center'
                          }}>
                            <div style={{ marginTop: '55px', textAlign: 'center', fontSize: '15px', letterSpacing: '1px', color: '#1e293b', fontFamily: 'Arial, sans-serif' }}>
                              COURSE<br/>CERTIFICATE
                            </div>
                            
                            {/* Con dấu tròn Logo */}
                            <div style={{ 
                              position: 'absolute', bottom: '50px', width: '120px', height: '120px', 
                              borderRadius: '50%', border: '2px dashed #64748b', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                              backgroundColor: 'rgba(255,255,255,0.5)'
                            }}>
                              <div style={{ 
                                width: '100%', height: '100%', borderRadius: '50%', 
                                border: '1px solid #64748b', display: 'flex', flexDirection: 'column', 
                                alignItems: 'center', justifyContent: 'center' 
                              }}>
                                {/* Viền chữ cong (Mô phỏng chữ vòng tròn) */}
                                <div style={{ fontSize: '7px', letterSpacing: '1px', marginBottom: '6px', fontFamily: 'Arial, sans-serif', color: '#475569' }}>
                                  • EDUCATION FOR EVERYONE •
                                </div>
                                <strong style={{ fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#000' }}>EduExam</strong>
                                <div style={{ fontSize: '7px', letterSpacing: '1px', marginTop: '6px', fontFamily: 'Arial, sans-serif', color: '#475569' }}>
                                  COURSE CERTIFICATE
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* ========================================================= */}


                          {/* ================= NỘI DUNG CHÍNH TRÁI ================= */}
                          <div style={{ position: 'relative', zIndex: 2, width: '65%', textAlign: 'left' }}>
                            
                            {/* Logo top left */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '60px' }}>
                              <img src="/images/logo.png" alt="Logo" style={{ height: '40px' }} />
                              <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', fontFamily: 'Arial, sans-serif' }}>EduExam</span>
                            </div>

                            {/* Ngày tháng */}
                            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '25px', fontFamily: 'Arial, sans-serif' }}>
                              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>

                            {/* Tên người học */}
                            <h1 style={{ fontSize: '38px', fontWeight: 'normal', margin: '0 0 20px 0', letterSpacing: '1px' }}>
                              {studentName}
                            </h1>

                            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 20px 0', fontFamily: 'Arial, sans-serif' }}>
                              đã hoàn thành xuất sắc
                            </p>

                            {/* Tên khóa học */}
                            <h2 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                              {courseInfo?.subjectName}
                            </h2>

                            {/* Thông tin mô tả nhỏ */}
                            <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', maxWidth: '85%', fontFamily: 'Arial, sans-serif', margin: '0' }}>
                              Một khóa học trực tuyến được ủy quyền bởi EduExam và cung cấp thông qua Hệ thống Đào tạo, có mã lớp chính thức là {courseInfo?.classCode}.
                            </p>

                   
                            <div style={{ 
                              marginTop: '20px', 
                              padding: '12px 0', 
                              fontFamily: 'Arial, sans-serif', 
                              fontSize: '13px', 
                              color: '#1e293b',
                              display: 'inline-block'
                            }}>
                              <span style={{ fontWeight: 'bold', color: '#475569' }}>Điểm tổng kết:</span> <strong style={{ fontSize: '15px' }}>{formatScore(gradesData?.summary?.finalScore)}/10</strong>
                              <span style={{ margin: '0 12px', color: '#cbd5e1' }}>|</span>
                              <span style={{ fontWeight: 'bold', color: '#475569' }}>Xếp loại:</span> <strong style={{ fontSize: '15px' }}>{gradesData?.summary?.statusText} ({gradesData?.summary?.letterGrade})</strong>
                            </div>

                          </div>


                          {/* ================= FOOTER CHỮ KÝ VÀ MÃ XÁC MINH ================= */}
                          
                          {/* Chữ ký trái */}
                          <div style={{ position: 'absolute', bottom: '40px', left: '40px', zIndex: 2 }}>
                             <div style={{ width: '180px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', marginBottom: '8px' }}>
                               {/* Chữ ký font Script */}
                               <div style={{ fontSize: '24px', fontWeight: 'bold', fontStyle: 'italic', color: '#111' }}>
                                  EduExam
                               </div>
                             </div>
                             <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>EduExam System</div>
                          </div>

                          {/* Xác minh phải  */}
                          <div style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 2, textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>Verify at:</div>
                              <div style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'underline', marginBottom: '10px', fontWeight: 'bold' }}>
                                eduexam.com/verify/{id?.slice(0, 12)}
                              </div>
                              <div style={{ fontSize: '9px', color: '#475569', maxWidth: '280px', marginLeft: 'auto', lineHeight: '1.5' }}>
                                  EduExam xác nhận danh tính của cá nhân này và việc họ đã tham gia khóa học.
                              </div>
                          </div>

                        </div>
                      </div>
                    </div>
                    {/* HẾT VÙNG HIỂN THỊ CHỨNG NHẬN */}

                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ĐÁNH GIÁ CỦA TÔI */}
          {activeTab === 'danhgia' && (
            <div className="sc-fade-in" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>Đánh giá khóa học</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '16px', backgroundColor: '#fffbeb', padding: '6px 12px', borderRadius: '20px' }}>
                  {reviewsData.avgRating} <FaStar /> 
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'normal' }}>({reviewsData.total} đánh giá)</span>
                </div>
              </div>

              {/* Form viết đánh giá */}
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 15px 0', color: '#1e293b' }}>
                  {reviewsData.myReview ? (
                      <>
                        <span style={{ fontSize: "12px", color: "#888" }}>
                          Bạn đã đánh giá khóa học này rồi!
                        </span>
                        <br />
                        Sửa đánh giá
                      </>
                    ) : ("Viết đánh giá của bạn")}
                </h3>
                <form onSubmit={handleSubmitReview}>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar 
                        key={star} 
                        size={24}
                        color={(hoverRating || ratingInput) >= star ? "#f59e0b" : "#cbd5e1"}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRatingInput(star)}
                        style={{ transition: 'color 0.2s' }}
                      />
                    ))}
                  </div>
                  <textarea 
                    rows={3} 
                    placeholder="Chia sẻ trải nghiệm học tập của bạn..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none', outline: 'none', marginBottom: '10px', fontFamily: 'inherit' }}
                  ></textarea>
                  <button 
                    type="submit" 
                    disabled={submittingReview}
                    style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: submittingReview ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FaPaperPlane /> {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </form>
              </div>

              {/* Danh sách các đánh giá khác */}
              <div className="sc-members-list">
                {reviewsData.reviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Chưa có đánh giá nào cho lớp học này. Hãy là người đầu tiên!
                  </div>
                ) : (
                  reviewsData.reviews.map((review: any) => (
                    <div key={review.id} style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                      <FaQuoteLeft style={{ position: 'absolute', top: '15px', right: '15px', opacity: 0.05, fontSize: '40px', color: '#0056d2' }} />
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                          <img 
                            src={review.student.avatarUrl ? `${BACKEND_URL}${review.student.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(review.student.fullName)}&background=random`} 
                            alt="Avatar" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{review.student.fullName}</div>
                          <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '2px' }}>
                            {[...Array(5)].map((_, i) => <FaStar key={i} color={i < review.rating ? "#f59e0b" : "#e2e8f0"} />)}
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '12px' }}>
                          {new Date(review.updatedAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                      <p style={{ color: '#475569', lineHeight: '1.6', margin: 0, paddingLeft: '55px' }}>{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab !== 'khoahoc' && activeTab !== 'thanhvien' && activeTab !== 'diemso' && activeTab !== 'nangluc' && activeTab !== 'danhgia' && (
            <div className="sc-empty-state sc-fade-in">
              <h3 style={{ color: '#64748b' }}>Nội dung đang được cập nhật</h3>
            </div>
          )}

        </div>

        <div className="sc-sidebar">
          <div className="sc-sidebar-card">
            <h3 className="sc-sidebar-title">Tiến độ học tập</h3>
            <div className="sc-progress-bar">
              <div className="sc-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <p className="sc-progress-text">{progressPercentage}% hoàn thành</p>
          </div>

          <div className="sc-sidebar-card">
            <h3 className="sc-sidebar-title">Thông tin lớp học</h3>
            <ul className="sc-info-list">
              <li>
                <FaInfoCircle color="#0d9488" />
                <div>
                  <strong>Mã lớp:</strong> <br />
                  <span style={{ color: '#475569' }}>{courseInfo?.classCode}</span>
                </div>
              </li>
              <li>
                <FaUserFriends color="#0d9488" />
                <div>
                  <strong>Sĩ số lớp:</strong> <br />
                  <span className="sc-badge-small" style={{ backgroundColor: '#f1f5f9', color: '#1e293b' }}>
                    {courseInfo?.currentStudents} sinh viên
                  </span>
                </div>
              </li>
              <li>
                <FaUsers color="#0d9488" />
                <div>
                  <strong>Trạng thái:</strong> <br />
                  <span className="sc-badge-small success">{courseInfo?.status === 'ACTIVE' ? 'Đang diễn ra' : 'Đã kết thúc'}</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="sc-sidebar-card">
            <h3 className="sc-sidebar-title">Giảng viên phụ trách</h3>
            <div className="sc-teacher-info">
              <div className="sc-teacher-avatar" style={{ overflow: 'hidden' }}>
                {courseInfo?.teacherAvatar ? (
                  <img src={`${BACKEND_URL}${courseInfo.teacherAvatar}`} alt={courseInfo?.teacherName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <FaChalkboardTeacher size={24} />
                )}
              </div>
              <div>
                <strong>{courseInfo?.teacherName || 'Khoa/Bộ môn'}</strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Giảng viên EduExam</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}