import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaLaptopCode, FaChalkboardTeacher, FaSignOutAlt, FaSearch, FaUserEdit,FaGraduationCap } from 'react-icons/fa';
import axiosClient from '../../api/axiosClient'; 
import './Header.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DEFAULT_COVER_IMAGE = '/images/default-course.jpg'; 
export default function Header() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('role'); 
  
  const [fullName, setFullName] = useState(localStorage.getItem('fullName') || 'Người dùng');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatarUrl') || '');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // STATES CHO CHỨC NĂNG TÌM KIẾM
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchUserData = async () => {
        try {
          const res = await axiosClient.get('/users/me');
          setFullName(res.data.fullName);
          if (res.data.avatarUrl) {
            setAvatarUrl(res.data.avatarUrl);
            localStorage.setItem('avatarUrl', res.data.avatarUrl);
          }
          localStorage.setItem('fullName', res.data.fullName);
        } catch (error) {
          console.error('Lỗi khi tải thông tin Header:', error);
        }
      };
      fetchUserData();
    }
  }, [isLoggedIn]);

  // Xử lý click ra ngoài để đóng menu dropdown HOẶC đóng khung tìm kiếm
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Đóng dropdown user
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      // Đóng popup gợi ý tìm kiếm
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
    window.location.reload();
  };

  const getAvatarSource = () => {
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== '') {
      return avatarUrl.startsWith('http') ? avatarUrl : `${BACKEND_URL}${avatarUrl}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff`;
  };

  // ==========================================
  // HÀM XỬ LÝ KHI NGƯỜI DÙNG GÕ TÌM KIẾM
  // ==========================================
  // ==========================================
  // HÀM XỬ LÝ KHI NGƯỜI DÙNG GÕ TÌM KIẾM
  // ==========================================
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchFocused(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        // Vẫn gọi chung API tìm kiếm public (vì API này quét toàn bộ hệ thống)
        const res = await axiosClient.get(`/public-classes/search/suggestions?q=${encodeURIComponent(value)}`, config);
        
        // === LỌC DỮ LIỆU RIÊNG CHO GIẢNG VIÊN ===
        // Nếu API trả về biến teacherId, bạn có thể kiểm tra xem lớp đó có phải của mình không
        // Tuy nhiên, hiện tại API searchPublicClasses chỉ trả về isJoined (dành cho sinh viên)
        // Để tiện nhất ở Frontend: Chúng ta cứ lưu toàn bộ kết quả. Logic chuyển hướng sẽ xử lý khi click.
        setSuggestions(res.data);
      } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
      }
    }, 300);
  };
  // Khi người dùng bấm phím Enter hoặc bấm nút Kính lúp (Sẽ điều hướng sang trang Khám phá)
  const handleExecuteSearch = () => {
    if (searchQuery.trim()) {
      setIsSearchFocused(false);
      // Giả sử bạn truyền tham số q qua URL vào trang Khám phá
      navigate(`/available-classes?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="exam-header">
      <Link to="/" className="exam-logo">
        <FaLaptopCode size={24} color="#00d8ff" /> EduExam
      </Link>
      
      <nav className="exam-nav">
        <Link to="/">Trang chủ</Link>
        {userRole !== 'TEACHER' && (
           <Link to="/available-classes">Khám phá</Link>
        )}
        {isLoggedIn && userRole === 'STUDENT' && (
          <Link to="/dashboard">Các lớp học của tôi</Link>
        )}
        <Link to="/blog">Tin tức & Sự kiện</Link>
        <Link to="/privacy-policy">Chính sách bảo mật</Link>
      </nav>

      <div className="exam-actions">
        
        {/* ========================================== */}
        {/* KHU VỰC TÌM KIẾM (CÓ GỢI Ý) */}
        {/* ========================================== */}
      <div className="exam-search-course" ref={searchRef} style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm khóa học, môn học..." 
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if(searchQuery.trim()) setIsSearchFocused(true); }}
            onKeyDown={(e) => { if(e.key === 'Enter') handleExecuteSearch(); }}
          />
          <button onClick={handleExecuteSearch}><FaSearch /></button>

          {/* Popup Gợi ý tìm kiếm hiển thị đè lên dưới ô input */}
          {/* Popup Gợi ý tìm kiếm hiển thị đè lên dưới ô input */}
          {isSearchFocused && searchQuery.trim() !== '' && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              backgroundColor: 'white', borderRadius: '8px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 9999,
              marginTop: '5px', border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              {suggestions.length === 0 ? (
                <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  Không tìm thấy kết quả nào cho "{searchQuery}"
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {suggestions.map((item) => {
                    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    const finalCoverUrl = item.coverImageUrl 
                      ? (item.coverImageUrl.startsWith('http') ? item.coverImageUrl : `${BACKEND_URL}${item.coverImageUrl}`) 
                      : DEFAULT_COVER_IMAGE; 

                    return (
                      <li 
                        key={item.id}
                        style={{ 
                          padding: '10px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px',
                          backgroundColor: item.isJoined ? '#f8fafc' : 'white' 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = item.isJoined ? '#f8fafc' : 'white'}
                        onClick={() => {
                          setIsSearchFocused(false);
                          setSearchQuery(''); 
                          
                          // ===============================================
                          // ĐIỀU HƯỚNG THÔNG MINH DỰA VÀO ROLE CỦA NGƯỜI DÙNG
                          // ===============================================
                          if (userRole === 'TEACHER') {
                            // Giảng viên luôn được chuyển vào trang QUẢN LÝ LỚP HỌC
                            // (Mặc định họ sẽ xem được chi tiết lớp học để tham khảo hoặc chỉnh sửa nếu là của họ)
                            navigate(`/teacher/class/${item.id}`); 
                          } 
                          else {
                            // Sinh viên hoặc Khách
                            if (item.isJoined) {
                              navigate(`/course/${item.id}`); // Vào học
                            } else {
                              navigate(`/available-classes/${item.id}`); // Mua/Xem thông tin
                            }
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <FaSearch color="#94a3b8" size={14} style={{ flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#64748b', fontSize: '12px' }}>Mã lớp: {item.code}</span>
                              
                              {/* Chỉ hiện nhãn Đã tham gia nếu KHÔNG PHẢI Giảng viên */}
                              {item.isJoined && userRole !== 'TEACHER' && (
                                <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                  Đã tham gia
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0 }}>
                          <img 
                            src={finalCoverUrl} 
                            alt={item.name} 
                            style={{ 
                              width: '45px', height: '32px', objectFit: 'cover', 
                              borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                              opacity: item.isJoined && userRole !== 'TEACHER' ? 0.8 : 1
                            }} 
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        {/* CÁC NÚT ĐĂNG NHẬP / AVATAR... */}
        {!isLoggedIn ? (
          <>
            <button className="exam-btn-login" onClick={() => navigate('/login')}>Đăng nhập</button>
            <button className="exam-btn-signup" onClick={() => navigate('/register')}>Đăng ký</button>
          </>
        ) : (
          <div className="exam-user-menu" ref={dropdownRef}>
            <div className="exam-avatar-wrapper" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span className="exam-user-name" style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                  {fullName}
                </span>
                
                <div className="header-avatar-circle" style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' 
                }}>
                  <img 
                    src={getAvatarSource()} 
                    alt="User Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff`;
                    }}
                  />
                </div>
              </div>
            </div>
            
          {isDropdownOpen && (
              <div className="exam-dropdown">
                <div className="exam-drop-header">
                  Xin chào, <span>{fullName}</span>!
                </div>
                
                {/* Dành cho Giảng viên */}
                {userRole === 'TEACHER' && (
                  <div className="exam-drop-item" onClick={() => { setIsDropdownOpen(false); navigate('/teacher-dashboard'); }}>
                    <FaChalkboardTeacher /> Quản lý Giảng viên
                  </div>
                )}

               
                {userRole === 'STUDENT' && (
                  <div className="exam-drop-item" onClick={() => { setIsDropdownOpen(false); navigate('/dashboard'); }}>
                    <FaGraduationCap /> Các lớp học của tôi
                  </div>
                )}

                {/* Dành cho Mọi User */}
                <div className="exam-drop-item" onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}>
                  <FaUserEdit /> Hồ sơ cá nhân
                </div>
                
                <div className="exam-drop-item text-red" onClick={handleLogout}>
                  <FaSignOutAlt /> Đăng xuất
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}