import React, { useEffect } from 'react';
import { 
  FaShieldAlt, FaUserLock, FaDatabase, FaCookieBite, 
  FaShareAlt, FaChild, FaSyncAlt, FaEnvelope 
} from 'react-icons/fa';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  // Cuộn lên đầu trang khi vào
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-container">
      {/* Banner Tiêu đề */}
      <div className="privacy-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}>
           
        </div>
        <div className="privacy-header-content" style={{ position: 'relative', zIndex: 2 }}>
          <h1>Chính Sách & Điều Khoản Bảo Mật</h1>
          <p>Cập nhật lần cuối: 25 tháng 04, 2026</p>
          <div className="privacy-header-badge">
            <FaShieldAlt /> EduExam Cam Kết Bảo Vệ Dữ Liệu Của Bạn
          </div>
        </div>
      </div>

      <div className="privacy-body">
        
        {/* Lời mở đầu */}
        <section className="privacy-intro">
          <h2>Chào mừng bạn đến với EduExam!</h2>
          <p>
            Tại EduExam, chúng tôi hiểu rằng quyền riêng tư là vô cùng quan trọng. 
            Chính sách bảo mật này mô tả chi tiết cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ 
            thông tin cá nhân của bạn khi bạn sử dụng nền tảng Hệ thống Quản lý Học tập (LMS) của chúng tôi.
          </p>
        </section>

        <div className="privacy-content-grid">
          
          {/* Cột Nội dung chính */}
          <div className="privacy-main-content">
            
            <article className="privacy-article" id="collect">
              <h3><FaDatabase className="article-icon" /> 1. Thông tin chúng tôi thu thập</h3>
              <div style={{ float: 'right', marginLeft: '20px', marginBottom: '10px', width: '200px' }}>
                
              </div>
              <p>Chúng tôi chỉ thu thập các thông tin cần thiết để cung cấp trải nghiệm học tập tốt nhất:</p>
              <ul>
                <li><strong>Thông tin bạn cung cấp:</strong> Họ tên, địa chỉ email, mật khẩu, ảnh đại diện, chức danh (Sinh viên/Giảng viên).</li>
                <li><strong>Dữ liệu học tập:</strong> Tiến độ khóa học, điểm số, bài nộp, chứng chỉ đạt được và các bình luận/đánh giá.</li>
                <li><strong>Thông tin hệ thống:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành và lịch sử đăng nhập để đảm bảo an ninh.</li>
              </ul>
              <div style={{ clear: 'both' }}></div>
            </article>

            <article className="privacy-article" id="use">
              <h3><FaUserLock className="article-icon" /> 2. Cách chúng tôi sử dụng thông tin</h3>
              <p>Dữ liệu của bạn được sử dụng tuyệt đối cho các mục đích liên quan đến giáo dục và vận hành:</p>
              <ul>
                <li>Cung cấp, duy trì và cá nhân hóa trải nghiệm học tập của bạn trên EduExam.</li>
                <li>Xác thực danh tính và quản lý quyền truy cập (Đăng nhập, bảo mật tài khoản).</li>
                <li>Cấp phát Chứng nhận hoàn thành khóa học và ghi nhận bảng điểm.</li>
                <li>Gửi các thông báo quan trọng về lớp học, cập nhật hệ thống hoặc hỗ trợ kỹ thuật.</li>
              </ul>
            </article>

            <article className="privacy-article" id="share">
              <h3><FaShareAlt className="article-icon" /> 3. Chia sẻ thông tin cá nhân</h3>
              <p>EduExam <strong>tuyệt đối không bán</strong> hoặc cho thuê dữ liệu cá nhân của bạn cho bên thứ ba. Thông tin chỉ được chia sẻ trong các trường hợp:</p>
              <ul>
                <li><strong>Giảng viên phụ trách:</strong> Giảng viên có quyền xem họ tên, email và tiến độ học tập của sinh viên trong lớp học của họ.</li>
                <li><strong>Yêu cầu pháp lý:</strong> Khi có yêu cầu hợp lệ từ cơ quan thực thi pháp luật.</li>
              </ul>
              <div className="privacy-alert">
                <strong>Lưu ý:</strong> Bất kỳ đánh giá hoặc bình luận nào bạn đăng trên trang Khóa học công khai đều có thể được nhìn thấy bởi những người dùng khác.
              </div>
            </article>

            <article className="privacy-article" id="cookies">
              <h3><FaCookieBite className="article-icon" /> 4. Sử dụng Cookies và Tracking</h3>
              <div style={{ float: 'left', marginRight: '20px', marginBottom: '10px', width: '150px' }}>
                
              </div>
              <p>
                Chúng tôi sử dụng Cookies (các tệp văn bản nhỏ lưu trên thiết bị của bạn) để duy trì phiên đăng nhập 
                và ghi nhớ các tùy chọn giao diện của bạn. Bạn có thể từ chối cookies thông qua cài đặt trình duyệt, 
                tuy nhiên điều này có thể làm giảm một số chức năng của hệ thống.
              </p>
              <div style={{ clear: 'both' }}></div>
            </article>

            <article className="privacy-article" id="rights">
              <h3><FaChild className="article-icon" /> 5. Quyền lợi của bạn</h3>
              <p>Theo các quy định về bảo vệ dữ liệu, bạn có các quyền sau đối với tài khoản EduExam của mình:</p>
              <ul>
                <li><strong>Quyền truy cập:</strong> Bạn có thể xem toàn bộ thông tin cá nhân trong mục "Hồ sơ cá nhân".</li>
                <li><strong>Quyền chỉnh sửa:</strong> Bạn có thể thay đổi tên, ảnh đại diện và mật khẩu bất kỳ lúc nào.</li>
                <li><strong>Quyền xóa dữ liệu:</strong> Bạn có quyền yêu cầu xóa vĩnh viễn tài khoản và dữ liệu liên quan bằng cách liên hệ bộ phận hỗ trợ.</li>
              </ul>
            </article>

            <article className="privacy-article" id="updates">
              <h3><FaSyncAlt className="article-icon" /> 6. Cập nhật chính sách</h3>
              <p>
                Chúng tôi có thể cập nhật Điều khoản bảo mật này theo thời gian để phản ánh các thay đổi 
                về tính năng hoặc pháp lý. Mọi thay đổi lớn sẽ được thông báo qua email hoặc banner trên trang chủ 
                ít nhất 7 ngày trước khi có hiệu lực.
              </p>
            </article>

          </div>

          {/* Cột Menu Phụ (Sidebar) */}
          <div className="privacy-sidebar">
            <div className="privacy-toc">
              <h4>Nội dung chính</h4>
              <ul>
                <li><a href="#collect">1. Thu thập thông tin</a></li>
                <li><a href="#use">2. Sử dụng thông tin</a></li>
                <li><a href="#share">3. Chia sẻ thông tin</a></li>
                <li><a href="#cookies">4. Sử dụng Cookies</a></li>
                <li><a href="#rights">5. Quyền lợi của bạn</a></li>
                <li><a href="#updates">6. Cập nhật chính sách</a></li>
              </ul>
            </div>

            <div className="privacy-contact">
              <h4><FaEnvelope /> Cần hỗ trợ?</h4>
              <div style={{ width: '100px', margin: '0 auto 15px auto' }}>
                
              </div>
              <p>Nếu bạn có bất kỳ thắc mắc nào về quyền riêng tư, vui lòng liên hệ với DPO (Nhân viên Bảo vệ Dữ liệu) của chúng tôi:</p>
              <a href="mailto:nthanh30082004@gmail.com" className="privacy-email-btn">nthanh30082004@gmail.com</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}