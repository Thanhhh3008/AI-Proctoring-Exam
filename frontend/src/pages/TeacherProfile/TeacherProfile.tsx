import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { FaLayerGroup, FaUserFriends, FaStar, FaEnvelope } from 'react-icons/fa';
import './TeacherProfile.css'; // ĐÃ ĐỔI SANG CSS MỚI

const DEFAULT_COVER_IMAGE = '/images/default-course.jpg';
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const formatReviewCount = (count: number) => {
  if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return count.toString();
};

export default function TeacherProfile() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  
  const [teacher, setTeacher] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosClient.get(`/public-classes/teacher/${teacherId}`);
        setTeacher(res.data.teacher);
        setCourses(res.data.courses);
      } catch (error) {
        console.error("Lỗi tải hồ sơ giảng viên", error);
      } finally {
        setLoading(false);
      }
    };
    if (teacherId) fetchProfile();
  }, [teacherId]);

  if (loading) return <div className="tp-loading">Đang tải hồ sơ giảng viên...</div>;
  if (!teacher) return <div className="tp-loading">Không tìm thấy giảng viên.</div>;

  const avatarUrl = teacher.avatarUrl 
    ? (teacher.avatarUrl.startsWith('http') ? teacher.avatarUrl : `${BACKEND_URL}${teacher.avatarUrl}`) 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName)}&background=10b981&color=fff&size=200`;

  return (
    <div className="tp-container">
      
      {/* 1. Phần Đầu: Thông tin Giảng viên */}
      <div className="tp-header">
        <div className="tp-avatar-wrapper">
          <img src={avatarUrl} alt={teacher.fullName} className="tp-avatar" />
        </div>
        <h1 className="tp-name">{teacher.fullName}</h1>
        <div className="tp-title">Giảng viên chuyên môn tại EduExam</div>
        <div className="tp-email">
          <FaEnvelope /> {teacher.email}
        </div>
      </div>

      {/* 2. Phần Lưới Khóa Học */}
      <div className="tp-courses-section">
        <h2 className="tp-courses-title">
          Các khóa học giảng dạy ({courses.length})
        </h2>

        {courses.length === 0 ? (
          <div className="tp-empty-state">
            Giảng viên này hiện chưa mở khóa học nào.
          </div>
        ) : (
          <div className="tp-grid">
            {courses.map((cls) => {
              const courseImageUrl = cls.coverImageUrl ? (cls.coverImageUrl.startsWith('http') ? cls.coverImageUrl : `${BACKEND_URL}${cls.coverImageUrl}`) : DEFAULT_COVER_IMAGE;
              const isFree = cls.price === 0;
              const displayPrice = isFree ? "Miễn phí" : `${cls.price.toLocaleString('vi-VN')} VNĐ`;

              return (
                <div 
                  key={cls.id} 
                  className="tp-card"
                  onClick={() => navigate(`/available-classes/${cls.id}`, { state: { courseData: cls, bgImage: courseImageUrl } })}
                >
                  <div className="tp-card-cover" style={{ backgroundImage: `url(${courseImageUrl})` }}>
                    <span className="tp-badge" style={{ backgroundColor: isFree ? '#10b981' : '#f59e0b', color: 'white' }}>
                      {displayPrice}
                    </span>
                  </div>
                  
                  <div className="tp-card-body">
                    <div className="tp-card-meta-top">
                      <FaLayerGroup size={12} color="#3b82f6" /> <span>{cls.moduleCount || 0} Module</span>
                    </div>

                    <h3 className="tp-course-title" title={cls.subjectName}>{cls.subjectName}</h3>
                    
                    <div className="tp-course-meta">
                      <span>Mã lớp: {cls.classCode}</span>
                      <span className="tp-flex-center"><FaUserFriends /> {cls.currentStudents}/{cls.maxStudents}</span>
                    </div>

                    <div className="tp-card-footer">
                      <div className="tp-rating">
                        <FaStar color="#FFD636" size={14} style={{ marginBottom: '2px' }} />
                        <span>
                          <strong>{cls.avgRating > 0 ? cls.avgRating : '0'}</strong> 
                          <span className="tp-dot">•</span> 
                          {formatReviewCount(cls.reviewCount)} Phản hồi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}