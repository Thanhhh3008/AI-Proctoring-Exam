import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { FaUserGraduate, FaChalkboardTeacher, FaSchool, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import '../Login/LoginPage.css'; 

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', role: 'STUDENT'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
  const [loading, setLoading] = useState(false);

  // --- HỆ THỐNG TOAST NOTIFICATION ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ message: '', type: null });
    }, 4000); 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. KIỂM TRA MẬT KHẨU NHẬP LẠI
    if (formData.password !== formData.confirmPassword) {
      showToast('Mật khẩu nhập lại không khớp!', 'error');
      return; 
    }

    setLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const res = await axiosClient.post('/auth/register', submitData);
      
      showToast('Đăng ký thành công! Vui lòng kiểm tra Email để kích hoạt.', 'success');
      
      // Chuyển về trang login sau 4 giây
      setTimeout(() => {
        navigate('/login');
      }, 4000);
      
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-container">
      
      {/* --- TOAST NOTIFICATION UI --- */}
      {toast.type && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '16px 24px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'toastSlideIn 0.3s ease-out forwards', fontWeight: 'bold', fontSize: '15px'
        }}>
          {toast.type === 'success' ? <FaCheckCircle size={20} /> : <FaExclamationTriangle size={20} />}
          {toast.message}
          <button onClick={() => setToast({ message: '', type: null })} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px', padding: 0, display: 'flex' }}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* 1. NỬA BÊN TRÁI */}
      <div className="login-left-panel">
        <div style={{ zIndex: 2 }}>
          <div className="login-badge">
            <div className="login-badge-dot"></div> Năm học 2025-2026
          </div>
          
          <h1 className="login-left-title">Hệ thống<br />Quản lý<br />Trường Đại học</h1>
          
          <p className="login-left-desc">
            Nâng tầm Giáo dục — Nền tảng thống nhất cho sinh viên, giảng viên và bộ phận quản lý được tích hợp công nghệ AI.
          </p>

          <div className="login-stats-grid">
            <div className="login-stat-box"><h3>12.480</h3><span>Sinh viên</span></div>
            <div className="login-stat-box"><h3>420</h3><span>Giảng viên</span></div>
            <div className="login-stat-box"><h3>68</h3><span>Chương trình</span></div>
          </div>
        </div>
        <div className="login-copyright">© 2026 EduExam LMS - Bảo lưu mọi quyền</div>
      </div>

      {/* 2. NỬA BÊN PHẢI - FORM ĐĂNG KÝ */}
      <div className="login-right-panel">
        <div className="login-form-card" style={{ maxWidth: '450px' }}>
          
          <div className="login-card-header">
            <div className="login-icon-box"><FaSchool size={24} /></div>
            <h2>Tạo tài khoản mới</h2>
            <p>Tham gia hệ thống EduExam LMS</p>
          </div>

          <form onSubmit={handleRegister}>
            
            {/* Chọn vai trò (Role) */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <label style={{ flex: 1, padding: '12px', border: formData.role === 'STUDENT' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: formData.role === 'STUDENT' ? '#eff6ff' : 'white', transition: 'all 0.2s' }}>
                <input type="radio" name="role" value="STUDENT" checked={formData.role === 'STUDENT'} onChange={handleChange} style={{ display: 'none' }} />
                <FaUserGraduate color={formData.role === 'STUDENT' ? '#2563eb' : '#64748b'} /> 
                <span style={{ fontWeight: formData.role === 'STUDENT' ? '600' : '500', color: formData.role === 'STUDENT' ? '#1e40af' : '#475569', fontSize: '14px' }}>Sinh viên</span>
              </label>

              <label style={{ flex: 1, padding: '12px', border: formData.role === 'TEACHER' ? '2px solid #ec4899' : '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: formData.role === 'TEACHER' ? '#fdf2f8' : 'white', transition: 'all 0.2s' }}>
                <input type="radio" name="role" value="TEACHER" checked={formData.role === 'TEACHER'} onChange={handleChange} style={{ display: 'none' }} />
                <FaChalkboardTeacher color={formData.role === 'TEACHER' ? '#ec4899' : '#64748b'} /> 
                <span style={{ fontWeight: formData.role === 'TEACHER' ? '600' : '500', color: formData.role === 'TEACHER' ? '#9d174d' : '#475569', fontSize: '14px' }}>Giảng viên</span>
              </label>
            </div>

            <div className="login-input-group">
              <label>Họ và tên</label>
              <div className="login-input-wrapper">
                <input type="text" name="fullName" placeholder="Ví dụ: Nguyễn Văn A" required value={formData.fullName} onChange={handleChange} />
              </div>
            </div>
            
            <div className="login-input-group">
              <label>Địa chỉ Email</label>
              <div className="login-input-wrapper">
                <input type="email" name="email" placeholder="Ví dụ: sinhvien@gmail.com" required value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div className="login-input-group">
              <label>Mật khẩu</label>
              <div className="login-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} name="password" 
                  placeholder="Từ 8-16 kí tự gồm số và chữ cái" required value={formData.password} onChange={handleChange} 
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-input-group">
              <label>Nhập lại mật khẩu</label>
              <div className="login-input-wrapper">
                <input 
                  type={showConfirmPassword ? "text" : "password"} name="confirmPassword" 
                  placeholder="Nhập lại mật khẩu" required value={formData.confirmPassword} onChange={handleChange} 
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn" style={{ marginTop: '10px' }}>
              {loading ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
            </button>

            <div className="login-register-hint">
              Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}