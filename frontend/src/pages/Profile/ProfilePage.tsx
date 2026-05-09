import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { 
  FaUser, FaCamera, FaLock, FaSave, FaEnvelope, FaShieldAlt, 
  FaChevronRight, FaEye, FaEyeSlash, FaSignOutAlt 
} from 'react-icons/fa';
import './ProfilePage.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info'); 
  const [loading, setLoading] = useState(false);
  
  // States dữ liệu người dùng
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // States Mật khẩu
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  
  // States ẩn/hiện mật khẩu
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axiosClient.get('/users/me');
        setFullName(res.data.fullName);
        setEmail(res.data.email);
        if (res.data.avatarUrl) {
          setAvatarPreview(res.data.avatarUrl);
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin người dùng:", err);
      }
    };
    fetchUserData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      if (selectedFile) formData.append('avatar', selectedFile);

      const res = await axiosClient.patch('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      localStorage.setItem('fullName', res.data.fullName);
      if (res.data.avatarUrl) localStorage.setItem('avatarUrl', res.data.avatarUrl);
      
      alert("Cập nhật hồ sơ thành công!");
    } catch (err) {
      alert("Lỗi khi cập nhật thông tin!");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return alert("Mật khẩu mới không khớp!");

    setLoading(true);
    try {
      await axiosClient.post('/users/change-password', {
        oldPassword: passwords.old,
        newPassword: passwords.new
      });
      alert("Đổi mật khẩu thành công!");
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="pp-wrapper">
      <div className="pp-container">
        
        {/* SIDEBAR BÊN TRÁI */}
        <aside className="pp-sidebar">
          <div className="pp-user-brief">
           <div className="pp-brief-avatar">
                    <img 
                        src={
                            avatarPreview 
                            ? (avatarPreview.startsWith('blob') ? avatarPreview : `${BACKEND_URL}${avatarPreview}`)
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=random&color=fff`
                        } 
                        alt="Avatar" 
                        onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=random&color=fff`;
                        }}
                    />
                </div>
            <div className="pp-brief-info">
                <h4>{fullName || 'Người dùng'}</h4>
                <p>{localStorage.getItem('role') === 'TEACHER' ? 'Giảng viên' : 'Sinh viên'}</p>
            </div>
          </div>

          <nav className="pp-menu">
            <button 
                className={`pp-menu-item ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
            >
              <FaUser /> <span>Thông tin cá nhân</span>
              <FaChevronRight className="arrow" />
            </button>
            <button 
                className={`pp-menu-item ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
            >
              <FaShieldAlt /> <span>Bảo mật & Mật khẩu</span>
              <FaChevronRight className="arrow" />
            </button>
            
            <div className="pp-menu-divider"></div>
            
            <button className="pp-menu-item logout-item" onClick={handleLogout}>
              <FaSignOutAlt /> <span>Đăng xuất</span>
            </button>
          </nav>
        </aside>

        {/* NỘI DUNG BÊN PHẢI */}
        <main className="pp-content">
          
          {activeTab === 'info' ? (
            <div className="pp-card fade-in">
              <h2 className="pp-title">Cài đặt hồ sơ</h2>
              <p className="pp-subtitle">Quản lý thông tin công khai và ảnh đại diện của bạn</p>

              <form onSubmit={handleUpdateProfile}>
                <div className="pp-avatar-edit">
                    <div className="pp-avatar-circle" onClick={() => fileInputRef.current?.click()}>
                        <img 
                            src={
                                avatarPreview 
                                ? (avatarPreview.startsWith('blob') ? avatarPreview : `${BACKEND_URL}${avatarPreview}`)
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=random&color=fff&size=128`
                            } 
                            alt="Avatar" 
                            onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=random&color=fff`;
                            }}
                        />
                        <div className="pp-avatar-overlay"><FaCamera /></div>
                    </div>
                    <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
                    <div className="pp-avatar-text">
                        <button type="button" className="btn-small-outline" onClick={() => fileInputRef.current?.click()}>Đổi ảnh đại diện</button>
                        <p>JPG, PNG. Tối đa 2MB.</p>
                    </div>
                </div>

                <div className="pp-form-grid">
                    <div className="pp-form-group">
                        <label>Email đăng nhập</label>
                        <div className="pp-input-box disabled">
                            <FaEnvelope />
                            <input type="text" value={email} disabled />
                        </div>
                    </div>
                    <div className="pp-form-group">
                        <label>Họ và tên</label>
                        <div className="pp-input-box">
                            <FaUser />
                            <input 
                                type="text" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Nhập họ tên đầy đủ"
                                required
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" className="pp-btn-primary" disabled={loading}>
                  <FaSave /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </form>
            </div>
          ) : (
            <div className="pp-card fade-in">
              <h2 className="pp-title">Đổi mật khẩu</h2>
              <p className="pp-subtitle">Đảm bảo tài khoản sử dụng mật khẩu an toàn</p>

              <form onSubmit={handleChangePassword}>
                <div className="pp-form-group">
                    <label>Mật khẩu hiện tại</label>
                    <div className="pp-input-box">
                        <FaLock />
                        <input 
                            type={showOld ? "text" : "password"} 
                            value={passwords.old}
                            onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                            required
                        />
                        <button type="button" className="pp-eye-btn" onClick={() => setShowOld(!showOld)}>
                            {showOld ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </div>

                <div className="pp-form-group">
                    <label>Mật khẩu mới</label>
                    <div className="pp-input-box">
                        <FaLock color="#10b981" />
                        <input 
                            type={showNew ? "text" : "password"} 
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            required
                        />
                        <button type="button" className="pp-eye-btn" onClick={() => setShowNew(!showNew)}>
                            {showNew ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </div>

                <div className="pp-form-group">
                    <label>Xác nhận mật khẩu mới</label>
                    <div className="pp-input-box">
                        <FaLock color="#10b981" />
                        <input 
                            type={showConfirm ? "text" : "password"} 
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            required
                        />
                        <button type="button" className="pp-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                            {showConfirm ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </div>

                <button type="submit" className="pp-btn-danger" disabled={loading}>
                   {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </button>
              </form>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}