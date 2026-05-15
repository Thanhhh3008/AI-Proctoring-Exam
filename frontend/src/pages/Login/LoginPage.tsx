import React, { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { FaSchool, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVerified = searchParams.get('verified') === 'true';

  // --- HỆ THỐNG TOAST NOTIFICATION ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ message: '', type: null });
    }, 3500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('role', response.data.user.role);
      localStorage.setItem('fullName', response.data.user.fullName);
      localStorage.setItem('avatarUrl', response.data.user.avatarUrl || '');

      showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
      setTimeout(() => {
        const role = response.data.user.role;
        if (role === 'ADMIN') {
          navigate('/admin');
        } else if (role === 'TEACHER') {
          navigate('/teacher-dashboard');
        } else {
          navigate('/');
        }
        window.location.reload();
      }, 2000); // Đợi 2s để hiện Toast rồi mới chuyển trang
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Đăng nhập thất bại. Sai email hoặc mật khẩu!', 'error');
    } finally {
      setIsSubmitting(false);
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

      {/* 1. NỬA BÊN TRÁI - THEME & THỐNG KÊ */}
      <div className="login-left-panel">
        <div style={{ zIndex: 2 }}>
          <div className="login-badge">
            <div className="login-badge-dot"></div> Năm học 2025-2026
          </div>

          <h1 className="login-left-title">Nền tảng chia sẻ Khóa học<br />& Thi trực tuyến với sự giám sát của AI</h1>

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

      {/* 2. NỬA BÊN PHẢI - FORM ĐĂNG NHẬP */}
      <div className="login-right-panel">
        <div className="login-form-card">

          <div className="login-card-header">
            <div className="login-icon-box"><FaSchool size={24} /></div>
            <h2>Đăng nhập vào tài khoản</h2>
            <p>Nhập thông tin đăng nhập để tiếp tục</p>
          </div>

          {isVerified && (
            <div style={{
              padding: '12px', marginBottom: '20px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 500,
              backgroundColor: '#d1fae5', color: '#065f46'
            }}>
              Xác thực Email thành công! Bạn có thể đăng nhập ngay bây giờ.
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <label>Tên đăng nhập / Email</label>
              <div className="login-input-wrapper">
                <input
                  type="email" placeholder="Ví dụ: sinhvien@gmail.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
            </div>

            <div className="login-input-group">
              <label>Mật khẩu</label>
              <div className="login-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"} placeholder="••••••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                />
                <button
                  type="button" className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember"><input type="checkbox" /> Ghi nhớ đăng nhập</label>
              <Link to="/forgot-password" className="login-forgot">Quên mật khẩu?</Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="login-submit-btn">
              {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>

            <div className="login-register-hint">
              Bạn chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}