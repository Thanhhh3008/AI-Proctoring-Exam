import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { 
  FaStar, FaInfoCircle, FaClock, FaUserTie, 
  FaQuoteLeft, FaEnvelope, FaChevronDown, FaChevronUp,
  FaGraduationCap, FaChalkboardTeacher, FaPlayCircle, FaBookOpen, FaFileAlt, FaShareAlt,
  FaQuestionCircle, FaFacebook, FaTwitter, FaLinkedin
} from 'react-icons/fa';
import './StudentAvailableCourseDetail.css';

const DEFAULT_COVER_IMAGE = '/images/default-course.jpg'; 
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function StudentAvailableCourseDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isLoggedIn = !!localStorage.getItem('accessToken');
  
  const initialCourseData = location.state?.courseData || null;
  const [courseData, setCourseData] = useState<any>(initialCourseData);
  
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('syllabus');
  const [reviewsData, setReviewsData] = useState({ reviews: [], avgRating: 0, total: 0 });

  const [suggestedCourses, setSuggestedCourses] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean; title: string; message: string; confirmText: string; type: 'login' | 'enroll' | 'success_joined' | 'error';
  }>({ isOpen: false, title: '', message: '', confirmText: 'OK', type: 'login' });

  // LẤY CHI TIẾT LỚP
  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await axiosClient.get(`/public-classes/${id}/detail`);
        setCourseInfo(res.data.course);
        
        const formattedSyllabus = res.data.sections.map((sec: any) => ({...sec, isOpen: true}));
        setSyllabus(formattedSyllabus);
        
        if (!courseData) {
          setCourseData({
            subjectName: res.data.course.subjectName,
            classCode: res.data.course.classCode,
            teacherName: res.data.course.teacherName,
            maxStudents: res.data.course.maxStudents,
            currentStudents: 0, 
            price: res.data.course.price,
            coverImageUrl: res.data.course.coverImageUrl,
            teacherAvatar: res.data.course.teacherAvatar // Bổ sung thêm lấy Avatar
          });
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin:", error);
      }
    };
    fetchDetail();
  }, [id, courseData]);

  // LẤY ĐÁNH GIÁ VÀ GỢI Ý
  useEffect(() => {
    if (!id) return;
    const fetchExtraData = async () => {
      try {
        const resReviews = await axiosClient.get(`/public-classes/${id}/reviews`);
        setReviewsData(resReviews.data);

        const endpoint = isLoggedIn ? '/classes/available' : '/public-classes/available';
        const resSuggest = await axiosClient.get(endpoint);
        const filtered = resSuggest.data.filter((c: any) => c.id !== id).slice(0, 4);
        setSuggestedCourses(filtered);
      } catch (err) {
        console.error("Lỗi lấy dữ liệu thêm", err);
      }
    }
    fetchExtraData();
  }, [id, isLoggedIn]);

  const handleEnrollClick = () => {
    if (!isLoggedIn) {
      setModalConfig({ isOpen: true, title: 'Yêu cầu đăng nhập', message: 'Bạn cần đăng nhập để tham gia khóa học này. Chuyển đến trang Đăng nhập?', confirmText: 'Đăng nhập', type: 'login' });
      return;
    }

    const price = courseData?.price !== undefined ? courseData.price : courseInfo?.price;
    
    if (price > 0) {
      // ĐÃ SỬA LẠI THÔNG BÁO CHO THANH TOÁN
      setModalConfig({
        isOpen: true, title: 'Xác nhận thanh toán',
        message: `Khóa học này có mức phí là ${price.toLocaleString('vi-VN')} VNĐ. Bạn sẽ được chuyển hướng sang cổng thanh toán an toàn MoMo.`,
        confirmText: 'Đồng ý thanh toán', type: 'enroll'
      });
    } else {
      setModalConfig({
        isOpen: true, title: 'Xác nhận tham gia',
        message: `Bạn có chắc chắn muốn tham gia khóa học "${courseData?.subjectName || courseInfo?.subjectName}" miễn phí ngay bây giờ không?`,
        confirmText: 'Tham gia ngay', type: 'enroll'
      });
    }
  };

  const executeModalAction = async () => {
    if (modalConfig.type === 'login') { navigate('/login'); return; }
    if (modalConfig.type === 'success_joined') { setModalConfig(prev => ({ ...prev, isOpen: false })); navigate('/dashboard'); return; }
    if (modalConfig.type === 'error') { setModalConfig(prev => ({ ...prev, isOpen: false })); return; }

    setModalConfig(prev => ({ ...prev, isOpen: false }));
    setIsSubmitting(true);
    
    const price = courseData?.price !== undefined ? courseData.price : courseInfo?.price;

    try {
      if (price > 0) {
        // ==========================================
        // LUỒNG THANH TOÁN CÓ PHÍ (GỌI API MOMO)
        // ==========================================
        const res = await axiosClient.post('/payment/create', { classId: id });
        
        // Chuyển hướng người dùng sang trang thanh toán của MoMo
        if (res.data && res.data.payUrl) {
          window.location.href = res.data.payUrl;
        } else {
          throw new Error('Không nhận được URL thanh toán từ máy chủ.');
        }

      } else {
        // ==========================================
        // LUỒNG ĐĂNG KÝ MIỄN PHÍ
        // ==========================================
        await axiosClient.post(`/classes/${id}/join`);
        setTimeout(() => {
          setModalConfig({ isOpen: true, title: 'Đăng ký thành công', message: 'Chúc mừng! Bạn đã được thêm vào lớp học thành công.', confirmText: 'Đến lớp học ngay', type: 'success_joined' });
        }, 300);
      }

    } catch (error: any) {
      setTimeout(() => {
        setModalConfig({ isOpen: true, title: 'Lỗi', message: error.response?.data?.message || error.message || "Có lỗi xảy ra, vui lòng thử lại sau!", confirmText: 'Đóng', type: 'error' });
      }, 300);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSectionStats = (activities: any[]) => {
    if (!activities) return { videos: 0, readings: 0, assignments: 0 };
    let videos = 0, readings = 0, assignments = 0;
    activities.forEach(act => {
      if (act.type === 'URL' || act.title.toLowerCase().includes('video')) videos++;
      else if (act.type === 'FILE') readings++;
      else assignments++;
    });
    return { videos, readings, assignments };
  };

  const toggleModule = (index: number) => {
    const newSyllabus = [...syllabus];
    newSyllabus[index].isOpen = !newSyllabus[index].isOpen;
    setSyllabus(newSyllabus);
  };

  if (!courseData && !courseInfo) return <div style={{ padding: '100px', textAlign: 'center', fontSize: '18px', color: '#64748b' }}>Đang tải thông tin khóa học...</div>;

  const activeCourseData = courseData || courseInfo;
  const bannerImgUrl = activeCourseData?.coverImageUrl ? `${BACKEND_URL}${activeCourseData.coverImageUrl}` : DEFAULT_COVER_IMAGE;
  const price = activeCourseData.price || 0;
  const isFree = price === 0;

  // 5 CÂU FAQ
  const faqs = [
    { q: "Khi nào tôi có quyền truy cập vào các bài giảng và bài tập?", a: "Ngay sau khi bạn tham gia (đối với lớp miễn phí) hoặc hoàn tất thanh toán (đối với lớp có phí), bạn sẽ có quyền truy cập vĩnh viễn vào toàn bộ tài liệu khóa học." },
    { q: "Tôi sẽ nhận được gì nếu tham gia khóa học này?", a: "Bạn sẽ được truy cập tất cả tài liệu, tham gia các bài kiểm tra đánh giá, và nhận Chứng chỉ hoàn thành khóa học nếu đạt điểm yêu cầu. Chứng chỉ này có thể thêm vào hồ sơ LinkedIn của bạn." },
    { q: "Có hỗ trợ tài chính (Học bổng) không?", a: "Hiện tại, EduExam đang hỗ trợ các khóa học miễn phí 100%. Đối với các khóa học có phí, vui lòng liên hệ trung tâm hỗ trợ để biết thêm về chính sách học bổng." },
    { q: "Tôi có thể hủy đăng ký và được hoàn tiền không?", a: "Nếu bạn không hài lòng với khóa học, hệ thống hỗ trợ hoàn tiền 100% trong vòng 7 ngày kể từ ngày đăng ký (áp dụng cho khóa học có phí)." },
    { q: "Khóa học này có cấp chứng chỉ không?", a: "Có! Sau khi bạn hoàn thành toàn bộ bài giảng và đạt số điểm tối thiểu qua các bài kiểm tra, hệ thống sẽ tự động cấp Chứng nhận điện tử hợp lệ." }
  ];

  return (
    <div className="csc-detail-container" style={{ position: 'relative' }}>
      
      {/* MODAL */}
      {modalConfig.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#202124', width: '90%', maxWidth: '400px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', color: '#e8eaed', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: '500', color: 'white' }}>{modalConfig.title}</h3>
            <p style={{ margin: '0 0 25px 0', fontSize: '14px', lineHeight: '1.5', color: '#bdc1c6' }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {(modalConfig.type === 'login' || modalConfig.type === 'enroll') && (
                <button onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid #5f6368', backgroundColor: 'transparent', color: '#e8eaed', cursor: 'pointer' }}>Huỷ</button>
              )}
              <button onClick={executeModalAction} style={{ padding: '8px 24px', borderRadius: '20px', border: 'none', backgroundColor: modalConfig.type === 'error' ? '#ef4444' : '#10b981', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{modalConfig.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <div className="csc-hero-section" style={{ backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%), url(${bannerImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="csc-hero-content">
          <h1 className="csc-hero-title" style={{ color: 'white' }}>{activeCourseData.subjectName}</h1>
          <div className="csc-hero-teacher" style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
              {activeCourseData?.teacherAvatar ? (
                <img
                  src={`${BACKEND_URL}${activeCourseData.teacherAvatar}`}
                  alt="teacher"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <FaChalkboardTeacher size={24} color="#94a3b8" style={{ margin: '8px' }} />
              )}
            </div>

            <div>
              <span>Giảng viên: </span>
              <strong style={{ color: 'white' }}>
                {activeCourseData.teacherName}
              </strong>
            </div>

          </div>
          
          <div className="csc-hero-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              className="csc-enroll-btn" 
              onClick={handleEnrollClick} 
              disabled={isSubmitting}
              style={{ backgroundColor: isLoggedIn ? '#2563eb' : '#b45309', padding: '16px 32px', fontSize: '18px' }}
            >
              {isSubmitting ? 'Đang kết nối...' : !isLoggedIn ? 'Đăng nhập để tham gia' : (isFree ? 'Đăng ký miễn phí' : `Mua khóa học - ${price.toLocaleString()} VNĐ`)}
            </button>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
              {isFree ? '★ Miễn phí 100%' : '★ Cam kết chất lượng'}
            </div>
          </div>
        </div>
      </div>

      <div className="csc-floating-stats">
        <div className="csc-stat-item">
          <div className="csc-stat-title" >{syllabus.length || 0} modules</div>
          <div className="csc-stat-desc">Nội dung bài giảng chia theo chuẩn chất lượng cao.</div>
        </div>
        <div className="csc-stat-item">
          <div className="csc-stat-title">{reviewsData.avgRating > 0 ? reviewsData.avgRating : '0'} <FaStar color="#f59e0b" size={16} /></div>
          <div className="csc-stat-desc">Đánh giá trung bình từ sinh viên tham gia.</div>
        </div>
        <div className="csc-stat-item">
          <div className="csc-stat-title"><FaClock color="#0056d2" /> Tự học</div>
          <div className="csc-stat-desc">Linh hoạt thời gian, học mọi lúc mọi nơi.</div>
        </div>
      </div>

      {/* MAIN CONTENT - 2 COLUMNS */}
      <div className="csc-layout-grid">
        <div className="csc-main-column">
          <div className="csc-content-section" style={{ padding: '0', boxShadow: 'none' }}>
            <div className="csc-tabs">
              <div className={`csc-tab ${activeTab === 'syllabus' ? 'active' : ''}`} onClick={() => setActiveTab('syllabus')}>Chương trình học</div>
              <div className={`csc-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>Về khóa học</div>
              <div className={`csc-tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Đánh giá</div>
            </div>

            <div className="csc-tab-content">
              
              {/* TAB: CHƯƠNG TRÌNH HỌC */}
              {activeTab === 'syllabus' && (
                <div className="fade-in">
                  {syllabus.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>Giảng viên chưa cập nhật nội dung bài giảng.</p>
                  ) : (
                    <>
                      {/* PHẦN GIỚI THIỆU TỔNG QUAN */}
                      <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '24px', color: '#1f1f1f', margin: '0 0 15px 0' }}>
                          Có {syllabus.length} module trong khóa học này
                        </h2>
                        <p style={{ color: '#1f1f1f', fontSize: '15px', lineHeight: '1.6', margin: '0 0 10px 0' }}>
                          Khóa học này cung cấp cho người học các công cụ thực tế để thúc đẩy sự đổi mới, hợp tác hiệu quả và điều hướng sự không chắc chắn trong các môi trường phức tạp. Bằng cách kết hợp tư duy chiến lược và hành động, khóa học này chuẩn bị cho bạn những kỹ năng thiết yếu để giải quyết các thách thức trong thế giới thực.
                        </p>
                        
                      </div>
                      
                      <div className="csc-modules-list">
                        {syllabus.map((sec, index) => {
                          const stats = calculateSectionStats(sec.activities);
                          return (
                            <div key={sec.id} className="csc-coursera-module">
                              <div className="csc-module-top" style={{ alignItems: 'flex-start' }}>
                                <div>
                                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1f1f1f' }}>{sec.title}</h3>
                                  <div style={{ color: '#636363', fontSize: '13px', display: 'flex', gap: '8px' }}>
                                    <span>Module {index + 1}</span> • <span>Ước tính 3 giờ hoàn thành</span>
                                  </div>
                                </div>
                                <div 
                                  onClick={() => toggleModule(index)}
                                  style={{ color: '#0056d2', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  Chi tiết Module {sec.isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                </div>
                              </div>
                              
                              {sec.isOpen && (
                                <div style={{ marginTop: '15px', animation: 'fadeIn 0.2s ease-in' }}>
                                  <p style={{ color: '#1f1f1f', fontSize: '14px', lineHeight: '1.6', margin: '0 0 15px 0' }}>
                                    {sec.description || `Trong module này, chúng ta sẽ tìm hiểu về ${sec.title}. Bạn sẽ được tiếp cận các khái niệm cốt lõi và ứng dụng thực tế thông qua các bài tập.`}
                                  </p>

                                  <div className="csc-whats-included">
                                    <div style={{ fontWeight: 'bold', margin: '20px 0 10px 0', fontSize: '14px', color: '#1f1f1f' }}>Nội dung bao gồm</div>
                                    <div style={{ display: 'flex', gap: '20px', color: '#1f1f1f', fontSize: '14px' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaPlayCircle color="#636363" /> {stats.videos} video</span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaBookOpen color="#636363" /> {stats.readings} tài liệu đọc</span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaFileAlt color="#636363" /> {stats.assignments} bài tập</span>
                                    </div>
                                  </div>
                                  
                                  <div 
                                    onClick={() => toggleModule(index)}
                                    style={{ marginTop: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#1f1f1f' }}
                                  >
                                    Ẩn thông tin nội dung <FaChevronUp size={10} />
                                  </div>
                                </div>
                              )}
                              
                              {!sec.isOpen && (
                                 <div 
                                  onClick={() => toggleModule(index)}
                                  style={{ marginTop: '15px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#1f1f1f' }}
                                >
                                  Hiển thị thông tin nội dung <FaChevronDown size={10} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB: VỀ KHÓA HỌC */}
              {activeTab === 'about' && (
                <div className="fade-in">
                  <h2 style={{ fontSize: '22px', marginBottom: '15px', color: '#1f1f1f' }}>Mô tả chi tiết</h2>
                  <div style={{ lineHeight: '1.8', color: '#1f1f1f', fontSize: '15px' }}>
                    <p>{courseInfo?.description || `Khóa học này cung cấp kiến thức nền tảng và chuyên sâu về ${activeCourseData.subjectName}. Bạn sẽ được thực hành qua các dự án thực tế.`}</p>
                    <p>Mục tiêu của khóa học này là giúp người học:</p>
                    <ul style={{ paddingLeft: '20px' }}>
                      <li>Nắm vững các khái niệm cốt lõi của môn học.</li>
                      <li>Hoàn thành các bài tập thực hành sát với thực tế.</li>
                      <li>Sau khi hoàn thành, học sinh sẽ được cấp chứng nhận từ EduExam.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB: ĐÁNH GIÁ */}
              {activeTab === 'reviews' && (
                <div className="fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <FaStar color="#f59e0b" size={24} />
                    <h2 style={{ margin: 0, fontSize: '24px' }}>{reviewsData.avgRating} <span style={{ color: '#636363', fontSize: '16px', fontWeight: 'normal' }}>({reviewsData.total} đánh giá)</span></h2>
                  </div>
                  <div className="csc-reviews-list">
                    {reviewsData.reviews.length === 0 ? (
                      <div style={{ color: '#636363' }}>Chưa có đánh giá.</div>
                    ) : (
                      reviewsData.reviews.map((review: any) => (
                        <div key={review.id} style={{ padding: '20px 0', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                              <img src={review.student.avatarUrl ? `${BACKEND_URL}${review.student.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(review.student.fullName)}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{review.student.fullName}</div>
                              <div style={{ color: '#f59e0b', fontSize: '12px' }}>{[...Array(5)].map((_, i) => <FaStar key={i} color={i < review.rating ? "#f59e0b" : "#e2e8f0"} />)}</div>
                            </div>
                          </div>
                          <p style={{ color: '#1f1f1f', lineHeight: '1.6', margin: 0 }}>{review.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - THÔNG TIN GIẢNG VIÊN */}
        <div className="csc-sidebar-column">
          <div className="csc-instructor-card">
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>Giảng viên phụ trách</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                {courseInfo?.teacherAvatar ? (
                    <img src={`${BACKEND_URL}${courseInfo.teacherAvatar}`} alt="teacher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <FaChalkboardTeacher size={40} color="#94a3b8" style={{ margin: '15px' }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f1f1f' }}>{activeCourseData.teacherName}</div>
                <div style={{ color: '#0056d2', fontSize: '14px', marginTop: '2px' }}>Giảng viên EduExam</div>
              </div>
            </div>
            <p style={{ color: '#636363', fontSize: '14px', lineHeight: '1.5', margin: '0 0 15px 0' }}>
              Chuyên gia trong lĩnh vực giảng dạy và phát triển kỹ năng với nhiều năm kinh nghiệm thực chiến.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => navigate(`/teacher-profile/${courseInfo?.teacherId || activeCourseData?.teacherId}`)} 
                style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #0056d2', color: '#0056d2', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Xem hồ sơ
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '20px', background: 'white', border: '1px solid #d5d7da', borderRadius: '8px' }}>
             <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Chia sẻ khóa học</h3>
             <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button style={{ padding: '10px 15px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 'bold', flex: 1, justifyContent: 'center' }}>
                  <FaShareAlt /> Share
                </button>
                <button style={{ padding: '10px', background: '#1877F2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white' }}><FaFacebook size={18} /></button>
                <button style={{ padding: '10px', background: '#1DA1F2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white' }}><FaTwitter size={18} /></button>
                <button style={{ padding: '10px', background: '#0A66C2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white' }}><FaLinkedin size={18} /></button>
             </div>
          </div>
        </div>
      </div>

      
     {/* SUGGESTED COURSES */}
      {suggestedCourses.length > 0 && (
        <div className="csc-suggested-section" style={{ maxWidth: '1200px', margin: '60px auto 0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Các khóa học gợi ý khác</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {suggestedCourses.map(cls => {
               const courseImageUrl = cls.coverImageUrl ? (cls.coverImageUrl.startsWith('http') ? cls.coverImageUrl : `${BACKEND_URL}${cls.coverImageUrl}`) : DEFAULT_COVER_IMAGE;
               
               return (
                 <div key={cls.id} onClick={() => navigate(`/available-classes/${cls.id}`, { state: { courseData: cls }})} style={{ border: '1px solid #d5d7da', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: 'white', transition: 'box-shadow 0.2s', display: 'flex', flexDirection: 'column' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                   <div style={{ height: '140px', background: `url(${courseImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                   
                   <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                       <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', flexShrink: 0 }}>
                         <img 
                           src={cls.teacherAvatar ? (cls.teacherAvatar.startsWith('http') ? cls.teacherAvatar : `${BACKEND_URL}${cls.teacherAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.teacherName || 'GV')}&background=random&color=fff`} 
                           alt={cls.teacherName} 
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                         />
                       </div>
                       <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {cls.teacherName}
                       </span>
                     </div>

                     <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f1f1f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                       {cls.subjectName}
                     </h4>
                     
                     <div style={{ marginTop: 'auto' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                         <FaStar color="#f59e0b" size={14} style={{ marginBottom: '2px' }} />
                         <span>
                           <strong style={{ color: '#0f172a' }}>{cls.avgRating > 0 ? cls.avgRating : '0'}</strong> 
                           <span style={{ color: '#94a3b8', margin: '0 4px' }}>( {cls.reviewCount || 0} )</span>
                         </span>
                       </div>

                       <div style={{ fontWeight: 'bold', fontSize: '15px', color: cls.price === 0 ? '#10b981' : '#F59E0B' }}>
                         {cls.price === 0 ? 'Miễn phí' : `${cls.price.toLocaleString('vi-VN')} đ`}
                       </div>
                     </div>

                   </div>
                 </div>
               )
            })}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button onClick={() => navigate('/available-classes')} style={{ padding: '10px 20px', background: 'white', border: '1px solid #0056d2', color: '#0056d2', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0056d2'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#0056d2'; }}>
              Khám phá thêm khóa học
            </button>
          </div>
        </div>
      )}
{/* FAQ SECTION - BỐ CỤC 2 CỘT */}
      <div className="csc-faq-section" style={{ maxWidth: '1200px', margin: '60px auto 0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '30px', color: '#1f1f1f' }}>Câu hỏi thường gặp</h2>
        
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Cột Accordion Câu hỏi */}
          <div style={{ flex: 7, minWidth: '600px', border: '1px solid #d5d7da', borderRadius: '8px', background: 'white' }}>
            {faqs.map((faq, index) => (
              <div key={index} style={{ borderBottom: index === faqs.length - 1 ? 'none' : '1px solid #e5e7eb' }}>
                <div 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  style={{ padding: '20px', cursor: 'pointer', display: 'flex', gap: '15px', alignItems: 'flex-start', fontWeight: 'bold', fontSize: '15px', color: '#1f1f1f' }}
                >
                  <div style={{ marginTop: '2px' }}>{openFaq === index ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}</div>
                  {faq.q}
                </div>
                {openFaq === index && (
                  <div style={{ padding: '0 20px 20px 45px', color: '#1f1f1f', lineHeight: '1.6', fontSize: '14px' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cột Info More questions */}
          <div style={{ flex: 3, minWidth: '300px', border: '1px solid #d5d7da', borderRadius: '8px', background: 'white', padding: '24px' }}>
            <FaQuestionCircle size={20} color="#1f1f1f" style={{ marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1f1f1f' }}>Câu hỏi khác</h3>
            <a href="#" style={{ color: '#0056d2', textDecoration: 'underline', fontSize: '14px', display: 'block', marginBottom: '25px', fontWeight: 'bold' }}>Truy cập trung tâm hỗ trợ học viên</a>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', fontSize: '13px', color: '#636363' }}>
              Có hỗ trợ tài chính, <a href="#" style={{ color: '#0056d2', textDecoration: 'none' }}>tìm hiểu thêm</a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}