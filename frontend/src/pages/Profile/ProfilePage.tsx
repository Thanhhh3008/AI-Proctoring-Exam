import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { 
  FaUser, FaCamera, FaLock, FaSave, FaEnvelope, FaShieldAlt, 
  FaChevronRight, FaEye, FaEyeSlash, FaSignOutAlt, FaIdCard,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaUpload
} from 'react-icons/fa';
import { notification } from 'antd';
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
  
  // States Ảnh chân dung (Xác thực khuôn mặt)
  const [baseFaceUrl, setBaseFaceUrl] = useState<string | null>(null);
  const [facePhotoVerified, setFacePhotoVerified] = useState(false);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [facePhotoLoading, setFacePhotoLoading] = useState(false);
  const facePhotoInputRef = useRef<HTMLInputElement>(null);

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
        if (res.data.avatarUrl) setAvatarPreview(res.data.avatarUrl);
        if (res.data.baseFaceUrl) setBaseFaceUrl(res.data.baseFaceUrl);
        setFacePhotoVerified(res.data.facePhotoVerified || false);
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
      
      notification.success({ message: 'Cập nhật hồ sơ thành công!' });
    } catch (err) {
      notification.error({ message: 'Lỗi khi cập nhật thông tin!' });
    } finally {
      setLoading(false);
    }
  };

  const handleFacePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notification.error({ message: 'Kích thước ảnh không được vượt quá 5MB!' });
      return;
    }
    setFacePhotoFile(file);
    setFacePhotoPreview(URL.createObjectURL(file));
  };

  const handleUploadFacePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facePhotoFile) {
      notification.warning({ message: 'Vui lòng chọn ảnh chân dung!' });
      return;
    }
    setFacePhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append('facePhoto', facePhotoFile);
      const res = await axiosClient.post('/users/face-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBaseFaceUrl(res.data.baseFaceUrl);
      setFacePhotoVerified(false); // Đang chờ duyệt
      setFacePhotoFile(null);
      setFacePhotoPreview(null);
      notification.success({
        message: 'Tải ảnh thành công!',
        description: 'Ảnh chân dung của bạn đã được gửi cho Admin xác nhận. Hãy chờ đợi phản hồi.',
        duration: 6,
      });
    } catch (err: any) {
      notification.error({ message: err.response?.data?.message || 'Lỗi khi tải ảnh!' });
    } finally {
      setFacePhotoLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      notification.error({ message: 'Mật khẩu mới không khớp!' });
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post('/users/change-password', {
        oldPassword: passwords.old,
        newPassword: passwords.new
      });
      notification.success({ message: 'Đổi mật khẩu thành công!' });
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (err: any) {
      notification.error({ message: err.response?.data?.message || 'Lỗi đổi mật khẩu' });
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

            {/* Chỉ hiển thị với Sinh viên */}
            {localStorage.getItem('role') === 'STUDENT' && (
              <button 
                  className={`pp-menu-item ${activeTab === 'facePhoto' ? 'active' : ''}`}
                  onClick={() => setActiveTab('facePhoto')}
              >
                <FaIdCard /> <span>Ảnh xác thực khuôn mặt</span>
                {!facePhotoVerified && baseFaceUrl && (
                  <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} title="Đang chờ duyệt" />
                )}
                {facePhotoVerified && (
                  <FaCheckCircle size={12} color="#10b981" style={{ marginLeft: 'auto' }} />
                )}
                <FaChevronRight className="arrow" />
              </button>
            )}

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
          
          {activeTab === 'facePhoto' ? (
            <div className="pp-card fade-in">
              <h2 className="pp-title">Ảnh xác thực khuôn mặt</h2>
              <p className="pp-subtitle">Hình ảnh chân dung này được sử dụng để xác nhận danh tính của bạn trong quá trình thi cử có bật chế độ giám sát AI.</p>

              {/* Trạng thái hiện tại */}
              {baseFaceUrl ? (
                <div style={{ marginBottom: 24, padding: '16px', borderRadius: 10, backgroundColor: facePhotoVerified ? '#f0fdf4' : '#fffbeb', border: `1px solid ${facePhotoVerified ? '#86efac' : '#fde68a'}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                  {facePhotoVerified
                    ? <FaCheckCircle size={22} color="#16a34a" />
                    : <FaClock size={22} color="#d97706" />
                  }
                  <div>
                    <div style={{ fontWeight: 700, color: facePhotoVerified ? '#15803d' : '#92400e', fontSize: 15 }}>
                      {facePhotoVerified ? 'Ảnh đã được xác nhận bởi Admin' : 'Đang chờ Admin xác nhận'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {facePhotoVerified
                        ? 'Ảnh của bạn sẽ được dùng để xác thực danh tính trong kỳ thi.'
                        : 'Ảnh đã được gửi đi, vui lòng chờ Admin xem xét. Bạn có thể cập nhật ảnh mới nếu muốn.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 24, padding: '16px', borderRadius: 10, backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <FaExclamationTriangle size={22} color="#dc2626" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 15 }}>Chưa có ảnh xác thực</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Bạn cần tải lên ảnh chân dung để tham gia các kỳ thi có giám sát AI.</div>
                  </div>
                </div>
              )}

              {/* Hiển thị ảnh hiện tại */}
              {baseFaceUrl && (
                <div style={{ marginBottom: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Ảnh đã đăng ký:</p>
                  <img
                    src={baseFaceUrl.startsWith('http') ? baseFaceUrl : `${BACKEND_URL}${baseFaceUrl}`}
                    alt="Ảnh chân dung"
                    style={{ width: 180, height: 220, objectFit: 'cover', borderRadius: 10, border: '3px solid ' + (facePhotoVerified ? '#86efac' : '#fde68a'), boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Form upload ảnh mới */}
              <form onSubmit={handleUploadFacePhoto}>
                <div className="pp-form-group">
                  <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>{baseFaceUrl ? 'Cập nhật ảnh mới' : 'Tải lên ảnh chân dung'}</label>
                  <div
                    onClick={() => facePhotoInputRef.current?.click()}
                    style={{ border: '2px dashed #cbd5e1', borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer', backgroundColor: '#f8fafc', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  >
                    {facePhotoPreview ? (
                      <img src={facePhotoPreview} alt="Preview" style={{ width: 160, height: 200, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div>
                        <FaUpload size={32} color="#94a3b8" style={{ marginBottom: 10 }} />
                        <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>Nhấn để chọn ảnh chân dung rõ nét</p>
                        <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 12 }}>JPG, PNG · Tối đa 5MB · Ảnh thẳng mặt, đủ sáng</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={facePhotoInputRef} hidden onChange={handleFacePhotoChange} accept="image/jpg,image/jpeg,image/png" />
                </div>

                {facePhotoPreview && (
                  <button type="submit" className="pp-btn-primary" disabled={facePhotoLoading} style={{ marginTop: 16 }}>
                    <FaUpload /> {facePhotoLoading ? 'Đang tải lên...' : 'Gửi ảnh cho Admin xác nhận'}
                  </button>
                )}
              </form>
            </div>
          ) : activeTab === 'info' ? (
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