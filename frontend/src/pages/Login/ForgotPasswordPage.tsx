import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaSchool, FaEye, FaEyeSlash, FaArrowLeft, FaEnvelope, FaKey, FaShieldAlt } from 'react-icons/fa';
// Import chung CSS của LoginPage để tái sử dụng giao diện Split-Screen
import './LoginPage.css'; 

// Import tạm thời axios (bạn có thể thay bằng authApi sau khi viết xong backend)
import axiosClient from '../../api/axiosClient';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  // Các state quản lý luồng
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Dữ liệu nhập vào
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);

  // ==========================================
  // BƯỚC 1: GỬI MÃ OTP VỀ EMAIL
  // ==========================================
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setErrorMsg('');
    try {
      // GỌI API BACKEND Ở ĐÂY (Bạn cần làm API POST /auth/forgot-password)
      await axiosClient.post('/auth/forgot-password', { email });
      setStep(2); // Chuyển sang bước nhập mã
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Email không tồn tại trong hệ thống!');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 2: XÁC THỰC MÃ OTP
  // ==========================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setErrorMsg('');
    try {
      // GỌI API BACKEND Ở ĐÂY (Bạn cần làm API POST /auth/verify-reset-otp)
      await axiosClient.post('/auth/verify-reset-otp', { email, otp });
      setStep(3); // Chuyển sang bước đổi mật khẩu
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Mã xác nhận không đúng hoặc đã hết hạn!');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 3: ĐẶT MẬT KHẨU MỚI
  // ==========================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      // GỌI API BACKEND Ở ĐÂY (Bạn cần làm API POST /auth/reset-password)
      await axiosClient.post('/auth/reset-password', { email, otp, newPassword });
      
      // Thành công thì hiển thị thông báo và quay về trang đăng nhập
      alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      navigate('/login'); 
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-container">
      
      {/* NỬA BÊN TRÁI - THEME */}
      <div className="login-left-panel">
        <div style={{ zIndex: 2 }}>
          <div className="login-badge">
            <div className="login-badge-dot"></div> Hệ thống Bảo mật
          </div>
          
          <h1 className="login-left-title">
            Khôi phục<br />Mật khẩu
          </h1>
          
          <p className="login-left-desc">
            Quy trình khôi phục tài khoản an toàn với xác thực 2 lớp qua Email. Vui lòng không chia sẻ mã xác nhận cho bất kỳ ai.
          </p>
        </div>
        <div className="login-copyright">© 2026 EduExam LMS - Bảo lưu mọi quyền</div>
      </div>

      {/* NỬA BÊN PHẢI - FORM */}
      <div className="login-right-panel">
        <div className="login-form-card">
          
          {/* NÚT QUAY LẠI */}
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: '20px' }}>
            <FaArrowLeft /> Quay lại đăng nhập
          </Link>

          <div className="login-card-header">
            <div className="login-icon-box" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
              {step === 1 ? <FaEnvelope size={24} /> : step === 2 ? <FaShieldAlt size={24} /> : <FaKey size={24} />}
            </div>
            <h2>
              {step === 1 ? 'Quên mật khẩu?' : step === 2 ? 'Nhập mã xác nhận' : 'Tạo mật khẩu mới'}
            </h2>
            <p style={{ color: '#64748b' }}>
              {step === 1 ? 'Nhập email đã đăng ký để nhận mã khôi phục.' 
                : step === 2 ? (<span>Mã 6 chữ số đã được gửi tới <strong>{email}</strong></span>) 
                : 'Vui lòng đặt mật khẩu mới mạnh và an toàn.'}
            </p>
          </div>

          {errorMsg && (
            <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '14px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* ======================= FORM BƯỚC 1 ======================= */}
          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <div className="login-input-group">
                <label>Địa chỉ Email</label>
                <div className="login-input-wrapper">
                  <input 
                    type="email" 
                    placeholder="Nhập email của bạn" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading} style={{ marginTop: '30px' }}>
                {loading ? 'Đang kiểm tra...' : 'Gửi mã xác nhận'}
              </button>
            </form>
          )}

          {/* ======================= FORM BƯỚC 2 ======================= */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="login-input-group">
                <label>Mã xác nhận (OTP)</label>
                <div className="login-input-wrapper">
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="Ví dụ: 123456" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Chỉ cho nhập số
                    required 
                    autoFocus
                    style={{ letterSpacing: '8px', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" disabled={loading} style={{ marginTop: '30px' }}>
                {loading ? 'Đang xác thực...' : 'Xác nhận mã'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button type="button" onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>
                  Gửi lại mã
                </button>
              </div>
            </form>
          )}

          {/* ======================= FORM BƯỚC 3 ======================= */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="login-input-group">
                <label>Mật khẩu mới</label>
                <div className="login-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Tối thiểu 6 ký tự" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                    autoFocus
                  />
                  <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="login-input-group">
                <label>Xác nhận mật khẩu mới</label>
                <div className="login-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Nhập lại mật khẩu mới" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading} style={{ marginTop: '30px', backgroundColor: '#10b981' }}>
                {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}