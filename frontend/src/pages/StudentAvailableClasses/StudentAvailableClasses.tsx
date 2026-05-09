import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { FaUserFriends, FaLayerGroup, FaSearch, FaTag, FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './StudentAvailableClasses.css';

interface AvailableClass {
  id: string;
  classCode: string;
  subjectName: string;
  teacherName: string;
  maxStudents: number;
  currentStudents: number;
  price: number; 
  teacherAvatar?: string;
  coverImageUrl?: string;
  moduleCount: number; 
  createdAt: string;  
  avgRating: number;   
  reviewCount: number;
}

const DEFAULT_COVER_IMAGE = '/images/default-course.jpg'; 
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const formatReviewCount = (count: number) => {
  if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return count.toString();
};

export default function StudentAvailableClasses() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [loading, setLoading] = useState(true);

  // LẤY TỪ KHÓA TÌM KIẾM TỪ HEADER
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';

  const isLoggedIn = !!localStorage.getItem('accessToken');

  // ==========================================
  // STATES CHO BỘ LỌC, SẮP XẾP VÀ PHÂN TRANG
  // ==========================================
  const [filters, setFilters] = useState({
    isFree: false,
    isPaid: false,
    ratingRange: 'ALL' // ALL, 4.5-5.0, 4.0-4.4, 3.0-3.9, 0.0-2.9
  });
  const [sortBy, setSortBy] = useState('newest');
  
  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12; // Số lượng khóa học mỗi trang

  useEffect(() => {
    const fetchAvailableClasses = async () => {
      try {
        const endpoint = isLoggedIn ? '/classes/available' : '/public-classes/available';
        const res = await axiosClient.get(endpoint);
        setClasses(res.data);
      } catch (error) {
        console.error('Lỗi tải danh sách lớp:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableClasses();
  }, [isLoggedIn]);

  // Reset trang về 1 mỗi khi đổi filter, sort hoặc search
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, searchQuery]);

  // ==========================================
  // XỬ LÝ LỌC & SẮP XẾP (Client-side)
  // ==========================================
  let finalClasses = classes.filter(cls => {
    // 1. Lọc theo từ khóa tìm kiếm (từ Header)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchSearch = (cls.subjectName && cls.subjectName.toLowerCase().includes(lowerQuery)) ||
                          (cls.classCode && cls.classCode.toLowerCase().includes(lowerQuery));
      if (!matchSearch) return false;
    }

    // 2. Lọc theo giá (Miễn phí / Có phí)
    if (filters.isFree && !filters.isPaid && cls.price > 0) return false;
    if (filters.isPaid && !filters.isFree && cls.price === 0) return false;

    // 3. Lọc theo khoảng sao đánh giá
    if (filters.ratingRange !== 'ALL') {
      const rating = cls.avgRating;
      switch (filters.ratingRange) {
        case '4.5-5.0': if (rating < 4.5 || rating > 5.0) return false; break;
        case '4.0-4.4': if (rating < 4.0 || rating >= 4.5) return false; break;
        case '3.0-3.9': if (rating < 3.0 || rating >= 4.0) return false; break;
        case '0.0-2.9': if (rating >= 3.0) return false; break;
      }
    }

    return true;
  });

  // 4. Thực hiện Sắp xếp (Sorting)
  finalClasses.sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price; // Rẻ nhất
      case 'price_desc': return b.price - a.price; // Đắt nhất
      case 'rating_desc': return b.avgRating - a.avgRating; // Đánh giá cao
      case 'reviews_desc': return b.reviewCount - a.reviewCount; // Nhiều lượt bình luận
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // ==========================================
  // XỬ LÝ PHÂN TRANG (Pagination)
  // ==========================================
  const totalPages = Math.ceil(finalClasses.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedClasses = finalClasses.slice(startIndex, startIndex + PAGE_SIZE);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFilters(prev => ({ ...prev, [name]: checked }));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Đang tìm kiếm các khóa học tốt nhất cho bạn...</div>;

  return (
    <div className="coursera-catalog-container">
      <div className="coursera-catalog-header">
        <h1>Khám phá khóa học</h1>
        <p>Tìm kiếm và học hỏi từ những giảng viên hàng đầu và nâng tầm kỹ năng của bạn ngay hôm nay.</p>
      </div>

      <div className="catalog-layout">
        
        {/* CỘT TRÁI: SIDEBAR BỘ LỌC */}
        <div className="catalog-sidebar">
          
          {/* Lọc theo giá */}
          <div className="filter-section">
            <div className="filter-title">Giá khóa học</div>
            <label className="filter-option">
              <input type="checkbox" name="isFree" checked={filters.isFree} onChange={handleFilterChange} />
              Miễn phí (0 VNĐ)
            </label>
            <label className="filter-option">
              <input type="checkbox" name="isPaid" checked={filters.isPaid} onChange={handleFilterChange} />
              Có tính phí
            </label>
          </div>

          {/* Lọc theo khoảng đánh giá */}
          <div className="filter-section">
            <div className="filter-title">Đánh giá trung bình</div>
            <label className="filter-option">
              <input type="radio" name="ratingRange" checked={filters.ratingRange === 'ALL'} onChange={() => setFilters(prev => ({ ...prev, ratingRange: 'ALL' }))} />
              Tất cả mức sao
            </label>
            <label className="filter-option">
              <input type="radio" name="ratingRange" checked={filters.ratingRange === '4.5-5.0'} onChange={() => setFilters(prev => ({ ...prev, ratingRange: '4.5-5.0' }))} />
              <span><FaStar color="#FFD636" /> Từ 4.5 đến 5.0 sao</span>
            </label>
            <label className="filter-option">
              <input type="radio" name="ratingRange" checked={filters.ratingRange === '4.0-4.4'} onChange={() => setFilters(prev => ({ ...prev, ratingRange: '4.0-4.4' }))} />
              <span><FaStar color="#FFD636" /> Từ 4.0 đến 4.4 sao</span>
            </label>
            <label className="filter-option">
              <input type="radio" name="ratingRange" checked={filters.ratingRange === '3.0-3.9'} onChange={() => setFilters(prev => ({ ...prev, ratingRange: '3.0-3.9' }))} />
              <span><FaStar color="#FFD636" /> Từ 3.0 đến 3.9 sao</span>
            </label>
            <label className="filter-option">
              <input type="radio" name="ratingRange" checked={filters.ratingRange === '0.0-2.9'} onChange={() => setFilters(prev => ({ ...prev, ratingRange: '0.0-2.9' }))} />
              <span><FaStar color="#FFD636" /> Dưới 3.0 sao</span>
            </label>
          </div>

        </div>

        {/* CỘT PHẢI: DANH SÁCH KHÓA HỌC */}
        <div className="catalog-content">
          
          <div className="catalog-sort-bar">
            <div style={{ fontSize: '15px', color: '#475569' }}>
              {searchQuery ? (
                <>Kết quả tìm kiếm cho: <strong>"{searchQuery}"</strong> <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '6px' }}>({finalClasses.length} kết quả)</span></>
              ) : (
                `Hiển thị ${finalClasses.length} khóa học`
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: '#1F1F1F' }}>Sắp xếp theo:</span>
              <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="rating_desc">Đánh giá cao nhất</option>
                <option value="reviews_desc">Nhiều bình luận nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>

          {finalClasses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <FaSearch size={40} color="#cbd5e1" style={{ marginBottom: '15px' }} />
              <p style={{ color: '#64748b', fontSize: '16px' }}>Không tìm thấy khóa học nào phù hợp.</p>
              <button 
                onClick={() => { setFilters({ isFree: false, isPaid: false, ratingRange: 'ALL' }); navigate('/available-classes'); }} 
                style={{ marginTop: '15px', padding: '8px 20px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Xóa tất cả bộ lọc & tìm kiếm
              </button>
            </div>
          ) : (
            <>
              {/* LƯU Ý: Đổi từ finalClasses.map sang paginatedClasses.map */}
              <div className="coursera-grid">
                {paginatedClasses.map((cls) => {
                  const courseImageUrl = cls.coverImageUrl 
                    ? (cls.coverImageUrl.startsWith('http') ? cls.coverImageUrl : `${BACKEND_URL}${cls.coverImageUrl}`) 
                    : DEFAULT_COVER_IMAGE;
                  
                  const isFree = cls.price === 0;
                  const displayPrice = isFree ? "Miễn phí" : `${cls.price.toLocaleString('vi-VN')} VNĐ`;
                  
                  return (
                    <div 
                      key={cls.id} 
                      className="coursera-card"
                      onClick={() => navigate(`/available-classes/${cls.id}`, { 
                          state: { courseData: cls, bgImage: courseImageUrl } 
                      })}
                    >
                      {/* Ảnh Cover */}
                      <div className="coursera-card-cover" style={{ backgroundImage: `url(${courseImageUrl})` }}>
                        <span 
                          className="coursera-badge"
                          style={{ 
                            backgroundColor: isFree ? '#10b981' : '#f59e0b',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            padding: '5px 12px'
                          }}
                        >
                          {displayPrice}
                        </span>
                      </div>
                      
                      {/* Nội dung khóa học */}
                      <div className="coursera-card-body">
                        
                        {/* Avatar Giảng viên */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#e2e8f0' }}>
                            <img 
                              src={cls.teacherAvatar 
                                ? (cls.teacherAvatar.startsWith('http') ? cls.teacherAvatar : `${BACKEND_URL}${cls.teacherAvatar}`) 
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.teacherName || 'GV')}&background=random&color=fff`} 
                              alt={cls.teacherName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                            {cls.teacherName}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                          <FaLayerGroup size={12} color="#3b82f6" />
                          <span>{cls.moduleCount || 0} Module bài giảng</span>
                        </div>

                        <h3 className="coursera-course-title" title={cls.subjectName}>
                          {cls.subjectName} - {cls.classCode}
                        </h3>
                        
                        <div className="coursera-course-meta">
                          <span style={{ fontWeight: '600' }}>Mã lớp: {cls.classCode}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FaUserFriends /> {cls.currentStudents}/{cls.maxStudents}
                          </span>
                        </div>

                        <div style={{ 
                          marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: '500' }}>
                            <FaStar color="#FFD636" size={14} style={{ marginBottom: '2px' }} />
                            <span>
                              <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                                {cls.avgRating > 0 ? cls.avgRating : '0'}
                              </strong> 
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

              {/* GIAO DIỆN PHÂN TRANG */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
                  <button 
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' }); // Tự động cuộn lên đầu
                    }}
                    disabled={currentPage === 1}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <FaChevronLeft size={12} color={currentPage === 1 ? '#cbd5e1' : '#475569'} />
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: currentPage === i + 1 ? '#2563eb' : '#e2e8f0',
                        backgroundColor: currentPage === i + 1 ? '#2563eb' : 'white',
                        color: currentPage === i + 1 ? 'white' : '#1e293b',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button 
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    <FaChevronRight size={12} color={currentPage === totalPages ? '#cbd5e1' : '#475569'} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}