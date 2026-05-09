import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLaptopCode, FaSchool, FaChalkboardTeacher, FaUsers, FaTasks, FaLightbulb, FaStar, FaCog, FaLayerGroup, FaUserFriends, FaTag } from 'react-icons/fa';
import axiosClient from '../api/axiosClient';
import './HomePage.css'; 

const DEFAULT_COVER_IMAGE = '/images/default-course.jpg'; 
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// DỮ LIỆU CÁC SLIDE BANNER
const HERO_SLIDES = [
  {
    title: "Nền tảng Học & Thi Trực Tuyến",
    subtitle: "Toàn Diện & Thông Minh",
    desc: "Nâng tầm tri thức với các khóa học chất lượng từ chuyên gia hàng đầu. Tích hợp hệ thống thi trực tuyến bảo mật, tự động giám sát chống gian lận bằng công nghệ AI tiên tiến.",
    image: "/images/index-banner.png"
  },
  {
    title: "Công Nghệ Giám Sát Bằng AI",
    subtitle: "Chống Gian Lận Tuyệt Đối",
    desc: "Hệ thống tự động phát hiện hành vi đáng ngờ: rời khỏi vị trí, có người lạ, hoặc chuyển tab trình duyệt. Ghi nhận hình ảnh làm bằng chứng minh bạch cho giảng viên.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"
  },
  {
    title: "Khóa Học Chuẩn Quốc Tế",
    subtitle: "Linh Hoạt Mọi Lúc Mọi Nơi",
    desc: "Truy cập hàng trăm khóa học đa lĩnh vực. Học theo lộ trình chuyên nghiệp, làm bài tập thực hành và nhận chứng chỉ điện tử uy tín ngay sau khi hoàn thành.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
  }
];

const formatReviewCount = (count: number) => {
  if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return count.toString();
};

export default function HomePage() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('accessToken');
  
  // State cho Banner Slider
  const [currentSlide, setCurrentPage] = useState(0);

  // State cho Khóa học nổi bật
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);

  // Lấy dữ liệu khóa học nổi bật
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const endpoint = isLoggedIn ? '/classes/available' : '/public-classes/available';
        const res = await axiosClient.get(endpoint);
        // Sắp xếp theo rating giảm dần và lấy 4 khóa học tốt nhất
        const topCourses = res.data.sort((a: any, b: any) => b.avgRating - a.avgRating).slice(0, 4);
        setFeaturedCourses(topCourses);
      } catch (error) {
        console.error('Lỗi tải danh sách nổi bật:', error);
      }
    };
    fetchFeatured();
  }, [isLoggedIn]);

  // Logic chuyển Slide tự động mỗi 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="home-container">
      
      {/* 1. HERO BANNER (SLIDER) */}
      <section className="new-hero-section">
        {/* Background mờ ẩn đằng sau cho Slide */}
        <div 
          className="hero-background-blur" 
          style={{ backgroundImage: `url(${HERO_SLIDES[currentSlide].image})` }}
        ></div>

        <div className="hero-content fade-in-slide" key={currentSlide}>
          <h1 className="hero-title">
            {HERO_SLIDES[currentSlide].title}<br/>
            <span>{HERO_SLIDES[currentSlide].subtitle}</span>
          </h1>
          <p className="hero-desc">
            {HERO_SLIDES[currentSlide].desc}
          </p>
          
          {!isLoggedIn && (
            <div className="hero-actions">
              <button className="hero-btn primary" onClick={() => navigate('/available-classes')}>
                Khám phá khóa học
              </button>
              <button className="hero-btn outline" onClick={() => navigate('/register')}>
                Đăng ký miễn phí
              </button>
            </div>
          )}
          
          <div className="hero-trust">
            <span>✓ Học tập linh hoạt</span>
            <span>✓ Giám sát AI 100%</span>
            <span>✓ Cấp chứng nhận</span>
          </div>
        </div>

        <div className="hero-illustration fade-in-slide" key={`img-${currentSlide}`}>
          <img src={HERO_SLIDES[currentSlide].image} alt="EduExam Platform" />
        </div>

        {/* Nút chuyển Slide Dot */}
        <div className="hero-slider-dots">
          {HERO_SLIDES.map((_, index) => (
            <span 
              key={index} 
              className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentPage(index)}
            ></span>
          ))}
        </div>
      </section>

      {/* 2. LỢI ÍCH KHI TRIỂN KHAI */}
      <section id="benefits" className="hp-benefits-section">
        {/* (Toàn bộ code cũ của section này giữ nguyên 100%) */}
        <h2 className="hp-section-title">Lợi ích khi triển khai giải pháp</h2>
        
        <FaLightbulb className="hp-floating-icon icon-bulb" />
        <FaStar className="hp-floating-icon icon-star" />
        <FaCog className="hp-floating-icon icon-gear" />
        <FaLaptopCode className="hp-floating-icon icon-pc" />

        <div className="hp-benefits-layout">
          <div className="hp-benefits-col-left">
            <div className="hp-benefit-card card-color-1">
              <h3>Với quản trị hệ thống</h3>
              <ul>
                <li>Cung cấp công cụ quản lý toàn diện cơ sở dữ liệu sinh viên, giảng viên và kỳ thi.</li>
                <li>Giám sát thời gian thực, đảm bảo hệ thống vận hành ổn định và bảo mật cao.</li>
              </ul>
            </div>
            
            <div className="hp-benefit-card card-color-2 ad2">
              <h3>Với nhà trường</h3>
              <ul>
                <li>Đảm bảo tính công bằng, minh bạch và nâng cao chất lượng đánh giá sinh viên.</li>
                <li>Tiết kiệm tối đa chi phí tổ chức thi, phòng thi và nhân sự coi thi.</li>
              </ul>
            </div>
          </div>

          <div className="hp-benefits-col-center">
            <div className="hp-blob-image">
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" alt="Sinh viên thi trực tuyến" />
            </div>
          </div>

          <div className="hp-benefits-col-right">
            <div className="hp-benefit-card card-color-3">
              <h3>Với giảng viên</h3>
              <ul>
                <li>Dễ dàng thiết lập ngân hàng câu hỏi, tạo đề thi tự động và trộn mã đề.</li>
                <li>Hệ thống tự động chấm điểm ngay sau nộp bài, giảm tải áp lực.</li>
              </ul>
            </div>
            
            <div className="hp-benefit-card card-color-4 ad">
              <h3>Với giám thị coi thi</h3>
              <ul>
                <li>AI tự động cảnh báo khi sinh viên có hành vi gian lận (quay cóp, rời vị trí).</li>
                <li>Cung cấp minh chứng gian lận bằng hình ảnh rõ ràng, khách quan.</li>
              </ul>
            </div>

            <div className="hp-benefit-card card-color-5">
              <h3>Với sinh viên</h3>
              <ul>
                <li>Làm bài trực tiếp trên trình duyệt, không cần cài đặt thêm phần mềm.</li>
                <li>Đánh giá chính xác năng lực bản thân, xem điểm ngay sau khi nộp.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5. KHÓA HỌC NỔI BẬT (SECTION MỚI THÊM VÀO ĐÂY) */}
      {featuredCourses.length > 0 && (
        <section className="hp-featured-courses-section">
          <div className="hp-featured-header">
            <h2>Khóa Học Nổi Bật</h2>
            <p>Học hỏi từ những giảng viên xuất sắc nhất và trau dồi kỹ năng của bạn</p>
          </div>
          
          <div className="hp-featured-grid">
            {featuredCourses.map((cls) => {
              const courseImageUrl = cls.coverImageUrl ? (cls.coverImageUrl.startsWith('http') ? cls.coverImageUrl : `${BACKEND_URL}${cls.coverImageUrl}`) : DEFAULT_COVER_IMAGE;
              const isFree = cls.price === 0;
              const displayPrice = isFree ? "Miễn phí" : `${cls.price.toLocaleString('vi-VN')} VNĐ`;

              return (
                <div 
                  key={cls.id} 
                  className="hp-course-card"
                  onClick={() => navigate(`/available-classes/${cls.id}`, { state: { courseData: cls, bgImage: courseImageUrl } })}
                >
                  <div className="hp-course-cover" style={{ backgroundImage: `url(${courseImageUrl})` }}>
                    <span className="hp-course-badge" style={{ backgroundColor: isFree ? '#10b981' : '#f59e0b' }}>
                      {displayPrice}
                    </span>
                  </div>
                  
                  <div className="hp-course-body">
                    <div className="hp-course-teacher">
                      <div className="hp-teacher-avatar">
                        <img 
                          src={cls.teacherAvatar ? (cls.teacherAvatar.startsWith('http') ? cls.teacherAvatar : `${BACKEND_URL}${cls.teacherAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.teacherName || 'GV')}&background=random&color=fff`} 
                          alt={cls.teacherName}
                        />
                      </div>
                      <span>{cls.teacherName}</span>
                    </div>

                    <div className="hp-course-meta-top">
                      <FaLayerGroup size={12} color="#3b82f6" /> <span>{cls.moduleCount || 0} Module bài giảng</span>
                    </div>

                    <h3 className="hp-course-title" title={cls.subjectName}>{cls.subjectName}</h3>
                    
                    <div className="hp-course-meta-mid">
                      <span>Mã lớp: {cls.classCode}</span>
                      <span><FaUserFriends /> {cls.currentStudents}/{cls.maxStudents}</span>
                    </div>

                    <div className="hp-course-footer">
                      <div className="hp-course-rating">
                        <FaStar color="#FFD636" size={14} />
                        <span>
                          <strong>{cls.avgRating > 0 ? cls.avgRating : '0'}</strong> 
                          <span style={{ margin: '0 6px', color: '#94a3b8' }}>•</span> 
                          {formatReviewCount(cls.reviewCount)} Phản hồi
                        </span>
                      </div>
                      <span style={{ color: isFree ? '#10b981' : '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaTag /> {isFree ? 'Đăng ký ngay' : 'Mua ngay'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button className="hp-view-all-btn" onClick={() => navigate('/available-classes')}>
              Xem tất cả khóa học
            </button>
          </div>
        </section>
      )}

      {/* 3. CÁC TÍNH NĂNG NỔI TRỘI */}
      <section id="features" className="hp-features-section">
        {/* (Code cũ phần tính năng giữ nguyên 100%) */}
        {/* Ảnh mô tả bên trái */}
        <div className="hp-features-left"></div>
        
        {/* Lưới tính năng bên phải */}
        <div className="hp-features-right">
          <h2>Các tính năng nổi trội</h2>
          <div className="hp-features-grid">
            <div className="hp-feature-item feat-color-1">
              <h4>Công nghệ Client-side AI</h4>
              <p>Mô hình AI nhận diện khuôn mặt chạy trực tiếp trên trình duyệt, giảm tải server và bảo mật quyền riêng tư.</p>
            </div>
            <div className="hp-feature-item feat-color-2">
              <h4>Giám sát thí sinh 24/7</h4>
              <p>Liên tục phân tích webcam để phát hiện vắng mặt, người lạ làm hộ, hoặc thí sinh quay đầu ngó nghiêng.</p>
            </div>
            <div className="hp-feature-item feat-color-3">
              <h4>Chống gian lận trình duyệt</h4>
              <p>Hệ thống bắt lỗi ngay khi thí sinh chuyển tab, thoát chế độ toàn màn hình hoặc copy/paste tài liệu.</p>
            </div>
            <div className="hp-feature-item feat-color-4">
              <h4>Quản lý bằng chứng tự động</h4>
              <p>Lưu trữ hình ảnh gian lận lập tức lên Cloud Storage, cung cấp minh chứng rõ ràng cho giảng viên.</p>
            </div>
            <div className="hp-feature-item feat-color-5">
              <h4>Ngân hàng câu hỏi đa dạng</h4>
              <p>Hỗ trợ đầy đủ các dạng câu hỏi trắc nghiệm, tự luận, xáo trộn câu hỏi và đáp án ngẫu nhiên.</p>
            </div>
            <div className="hp-feature-item feat-color-6">
              <h4>Chấm điểm & Thống kê realtime</h4>
              <p>Tự động chấm điểm ngay sau khi nộp bài, biểu đồ hóa dữ liệu trực quan cho quản trị viên.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NHỮNG CON SỐ BIẾT NÓI */}
      <section id="stats" className="hp-stats-section">
        <div className="hp-stats-wave"></div>
        <h2>Những con số biết nói</h2>
        <div className="hp-stats-container">
          <div className="hp-stat-card stat-1">
            <FaSchool size={40} color="#ff7043" />
            <strong>200+</strong><span>Lớp học</span>
          </div>
          <div className="hp-stat-card stat-2">
            <FaChalkboardTeacher size={40} color="#26a69a" />
            <strong>50+</strong><span>Giảng viên</span>
          </div>
          <div className="hp-stat-card stat-3">
            <FaUsers size={40} color="#5c6bc0" />
            <strong>5,000+</strong><span>Sinh viên</span>
          </div>
          <div className="hp-stat-card stat-4">
            <FaTasks size={40} color="#ab47bc" />
            <strong>10K+</strong><span>Lượt làm bài</span>
          </div>
        </div>
      </section>

    </div>
  );
}