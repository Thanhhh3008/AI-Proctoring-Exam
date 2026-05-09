import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FaBookOpen, FaSignOutAlt, FaSearch, FaUsers, 
  FaArrowRight, FaStar, FaLightbulb, FaRobot, FaCheckCircle, FaFire,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { classApi } from '../../api/classApi';
import './Dashboard.css';

const DEFAULT_COVER_IMAGE = '/images/default-course.jpg'; 
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  
  // STATE PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;
  
  const [greeting, setGreeting] = useState('Xin chào');
  const fullName = localStorage.getItem('fullName') || 'Học viên';
  const initial = fullName.charAt(0).toUpperCase();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');

    const fetchCourses = async () => {
      try {
        const response = await classApi.getMyClasses();
        const coursesWithRandomProgress = response.data.map((course: any) => ({
          ...course,
          randomProgress: Math.floor(Math.random() * 95) + 1 
        }));
        setCourses(coursesWithRandomProgress);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/');
  };

  // Reset về trang 1 khi chuyển Tab hoặc gõ Tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // TÍNH TOÁN DỮ LIỆU ĐỂ HIỂN THỊ
  const activeCoursesCount = courses.filter(c => c.status === 'ACTIVE').length;
  const completedCoursesCount = courses.filter(c => c.status === 'COMPLETED').length;

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.classCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = course.status === activeTab;
    return matchesSearch && matchesTab;
  });

  // LOGIC PHÂN TRANG
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentCourses = filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="cs-dashboard-wrapper">
      
      {/* CONTAINER CHÍNH */}
      <div className="cs-main-container">
        
        <div className="cs-greeting-section">
          <div className="cs-big-avatar">{initial}</div>
          <h1 className="cs-greeting-text">{greeting}, {fullName}</h1>
        </div>

        <div className="cs-ai-banner">
          <div className="cs-ai-icon">
             <FaRobot size={24} color="#0056d2" />
          </div>
          <span>Bạn cần giúp đỡ? Hãy kể cho tôi một chút về bản thân để tôi có thể đưa ra những khóa học phù hợp nhất với bạn.</span>
        </div>

        <div className="cs-layout-columns">
          
          {/* CỘT TRÁI: MỤC TIÊU */}
          <aside className="cs-sidebar-left">
            <div className="cs-goals-card" style={{ marginBottom: '20px' }}>
              <h3 className="cs-goals-title">Mục tiêu hôm nay</h3>
              <ul className="cs-goals-list">
                <li>
                  <div className="cs-goal-icon"><FaCheckCircle color="#9ca3af" /></div>
                  <div className="cs-goal-text">Hoàn thành bất kỳ 1 mục học tập nào <br/><span>0/1 mục</span></div>
                </li>
                <li>
                  <div className="cs-goal-icon"><FaFire color="#f59e0b" /></div>
                  <div className="cs-goal-text">Duy trì chuỗi ngày học tập liên tiếp<br/><span>Đang có: Chuỗi 0 ngày</span></div>
                </li>
                <li>
                  <div className="cs-goal-icon"><FaLightbulb /></div>
                  <div className="cs-goal-text" style={{textDecoration: 'underline', cursor: 'pointer', color: '#0056d2', fontWeight: 500}}>
                    Thêm mục tiêu nghề nghiệp
                  </div>
                </li>
              </ul>
            </div>

            <div className="cs-goals-card">
              <h3 className="cs-goals-title">Gợi ý cho bạn</h3>
              <p style={{fontSize: '14px', color: '#4b5563', lineHeight: '1.6'}}>
                Hãy dành ra ít nhất <strong>30 phút</strong> mỗi ngày để ôn tập bài giảng. Việc học đều đặn sẽ giúp bạn ghi nhớ kiến thức tốt hơn so với việc học nhồi nhét.
              </p>
            </div>
          </aside>

          {/* CỘT PHẢI: KHÓA HỌC */}
          <main className="cs-main-right">
            
            {/* TABS VÀ THANH TÌM KIẾM */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              
              <div className="cs-tabs-pill-container" style={{ margin: 0 }}>
                <button 
                  className={`cs-tab-pill ${activeTab === 'ACTIVE' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ACTIVE')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Đang tiến hành
                  <span style={{ 
                    backgroundColor: activeTab === 'ACTIVE' ? '#1d4ed8' : '#e5e7eb', 
                    color: activeTab === 'ACTIVE' ? 'white' : '#4b5563', 
                    padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                  }}>
                    {activeCoursesCount}
                  </span>
                </button>
                <button 
                  className={`cs-tab-pill ${activeTab === 'COMPLETED' ? 'active' : ''}`}
                  onClick={() => setActiveTab('COMPLETED')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Đã hoàn thành
                  <span style={{ 
                    backgroundColor: activeTab === 'COMPLETED' ? '#1d4ed8' : '#e5e7eb', 
                    color: activeTab === 'COMPLETED' ? 'white' : '#4b5563', 
                    padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                  }}>
                    {completedCoursesCount}
                  </span>
                </button>
              </div>

              {/* Ô TÌM KIẾM */}
              <div style={{ position: 'relative', width: '300px' }}>
                <FaSearch style={{ position: 'absolute', top: '12px', left: '15px', color: '#9ca3af' }} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm theo tên hoặc mã môn..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', padding: '10px 15px 10px 40px', borderRadius: '20px', 
                    border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' 
                  }}
                />
              </div>

            </div>

            {loading ? (
              <div className="cs-empty-state">Đang tải dữ liệu lớp học...</div>
            ) : courses.length === 0 ? (
              <div className="cs-empty-state">
                <h3>Bạn chưa tham gia khóa học nào</h3>
                <button onClick={() => navigate('/available-classes')} className="cs-btn-primary" style={{ marginTop: '15px' }}>
                  Khám phá khóa học ngay
                </button>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="cs-empty-state">
                <p>Không có khóa học nào khớp với tìm kiếm của bạn trong mục này.</p>
              </div>
            ) : (
              <div className="cs-course-list">
                {currentCourses.map((course) => {
                  const courseImageUrl = course.coverImageUrl 
                    ? `${BACKEND_URL}${course.coverImageUrl}` 
                    : DEFAULT_COVER_IMAGE;

                  const progress = activeTab === 'COMPLETED' ? 100 : course.randomProgress;

                  return (
                    <div 
                      key={course.id} 
                      className="cs-course-card-horizontal"
                      onClick={() => navigate(`/course/${course.id}`)}
                      style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', marginBottom: '20px' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                      }}
                    >
                      <div 
                        className="cs-card-img" 
                        style={{ backgroundImage: `url(${courseImageUrl})`, width: '250px', flexShrink: 0 }}
                      ></div>
                      
                      <div className="cs-card-content" style={{ flex: 1, padding: '20px' }}>
                        <div className="cs-card-university" style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px' }}>
                          EduExam University
                        </div>
                        <h3 className="cs-card-title" title={course.subjectName} style={{ fontSize: '20px', margin: '0 0 10px 0', color: '#111827' }}>
                          {course.subjectName}
                        </h3>
                        <p className="cs-card-meta" style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          Mã lớp: {course.classCode} • <FaUsers/> {course.studentCount || 0}/{course.maxStudents}
                        </p>
                        
                        {/* THANH TIẾN ĐỘ HỌC TẬP */}
                        <div className="cs-progress-wrapper" style={{ marginBottom: '20px' }}>
                          <div className="cs-progress-info" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                            <span style={{ color: '#4b5563' }}>Tiến độ học tập</span>
                            <strong style={{ color: '#111827' }}>{progress}% hoàn thành</strong>
                          </div>
                          <div className="cs-progress-bar-bg" style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                            <div className="cs-progress-bar-fill" style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? '#10b981' : '#2563eb', transition: 'width 0.5s ease-out' }}></div>
                          </div>
                        </div>

                        <button className="cs-card-btn-go" style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}>
                          {activeTab === 'COMPLETED' ? 'Xem lại' : 'Tiếp tục học'} <FaArrowRight size={12}/>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* THANH ĐIỀU HƯỚNG PHÂN TRANG */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#9ca3af' : '#111827' }}
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
                          borderColor: currentPage === i + 1 ? '#2563eb' : '#e5e7eb',
                          backgroundColor: currentPage === i + 1 ? '#2563eb' : 'white',
                          color: currentPage === i + 1 ? 'white' : '#111827',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#9ca3af' : '#111827' }}
                    >
                      <FaChevronRight size={12} />
                    </button>
                  </div>
                )}

              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}