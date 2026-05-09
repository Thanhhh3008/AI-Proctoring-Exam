import React from 'react';
import { 
  FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaGlobe,
  FaFacebookSquare, FaYoutube, FaLinkedin
} from 'react-icons/fa';
import './Footer.css';

export default function Footer() {
  return (
    <div className="global-footer-wrapper">
      {/* Nền lượn sóng phía trên */}
      <div className="footer-wave">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,20 C288,80 432,0 720,20 C1008,40 1152,-10 1440,20 L1440,80 L0,80 Z" fill="#ff7043" />
          <path d="M0,40 C288,100 432,20 720,40 C1008,60 1152,10 1440,40 L1440,80 L0,80 Z" fill="#1a2b4c" />
        </svg>
      </div>
      
      <footer className="footer-main">
        <div 
          className="footer-content" 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '40px', // Tăng khoảng cách giữa các cột cho thoáng hơn
            padding: '40px 20px', 
            maxWidth: '1200px', 
            margin: '0 auto',
            color: '#f8fafc' 
          }}
        >
          
          {/* CỘT 1: THƯƠNG HIỆU */}
          <div className="footer-col" style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <h3 style={{ borderBottom: '2px solid #ff7043', paddingBottom: '10px', marginBottom: '20px', fontSize: '18px' }}>
              EduExam Teacher
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              Nền tảng học và thi trực tuyến giúp quản lý giáo dục dễ dàng, hiệu quả và minh bạch. Mang lại trải nghiệm tốt nhất cho cả người dạy và người học.
            </p>
            <div className="social-icons" style={{ display: 'flex', gap: '15px', fontSize: '20px' }}>
              <a href="#" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}><FaLinkedin /></a>
              <a href="#" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}><FaFacebookSquare /></a>
              <a href="#" style={{ color: '#cbd5e1', transition: 'color 0.2s' }}><FaYoutube /></a>
            </div>
          </div>

          {/* CỘT 2: VỀ CHÚNG TÔI */}
          <div className="footer-col" style={{ flex: '1 1 200px' }}>
            <h3 style={{ borderBottom: '2px solid #ff7043', paddingBottom: '10px', marginBottom: '20px', fontSize: '18px' }}>
              Về chúng tôi
            </h3>
            <ul className="footer-links" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
              <li><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', whiteSpace: 'nowrap' }}>Giới thiệu nền tảng</a></li>
              <li><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', whiteSpace: 'nowrap' }}>Tuyển dụng</a></li>
              <li><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', whiteSpace: 'nowrap' }}>Blog giáo dục</a></li>
              <li><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', whiteSpace: 'nowrap' }}>Bảng giá dịch vụ</a></li>
              <li><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', whiteSpace: 'nowrap' }}>Điều khoản bảo mật</a></li>
            </ul>
          </div>

          {/* CỘT 3: LIÊN HỆ */}
          <div className="footer-col" style={{ flex: '1 1 300px' }}>
            <h3 style={{ borderBottom: '2px solid #ff7043', paddingBottom: '10px', marginBottom: '20px', fontSize: '18px' }}>
              Liên hệ
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#cbd5e1' }}>
                <FaEnvelope color="#ff7043" /> nthanh30082004@gmail.com
              </div>
              <div className="contact-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#cbd5e1' }}>
                <FaPhoneAlt color="#ff7043" /> 0937774779
              </div>
              <div className="contact-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>
                <FaMapMarkerAlt color="#ff7043" style={{ marginTop: '3px', flexShrink: 0 }} /> 15/8a Bùi Trọng Nghĩa, Đồng Nai
              </div>
              
            </div>
          </div>

        </div>

        {/* DẢI COPYRIGHT DƯỚI CÙNG */}
        <div 
          className="footer-bottom" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)', 
            padding: '15px 20px', 
            textAlign: 'center', 
            borderTop: '1px solid rgba(255,255,255,0.05)' 
          }}
        >
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
            &copy; 2026 EduExam Platform. Phát triển bởi NThanh. Bảo lưu mọi quyền.
          </p>
        </div>
      </footer>
    </div>
  );
}