import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  FaBook, FaUsers, FaChartPie, FaPlus, FaEdit, FaUserTimes,
  FaGraduationCap, FaTimes, FaCheckCircle, FaUserFriends,
  FaPlayCircle, FaUndo, FaEllipsisV,
  FaDollarSign, FaStar, FaChartLine, FaPaintBrush, FaMobileAlt, FaLayerGroup, FaFigma, FaSearch,
  FaEnvelope, FaBookOpen, FaFileSignature, FaTag, FaCheck, FaExclamationTriangle, FaQuestionCircle,
  FaCalendarAlt, FaComments, FaChevronRight, FaBars
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './TeacherDashboard.css';

import TeacherGrading from './TeacherGrading';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DEFAULT_COVER_IMAGE = '/images/default-course.jpg';
interface TeacherClass {
  id: string; classCode: string; maxStudents: number; subjectName: string; subjectCode: string; status: string; studentCount: number;
  price: number;
  coverImageUrl?: string | null;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingGradingCount, setPendingGradingCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'CLASSES' | 'GRADING' | 'SCHEDULE' | 'REVIEWS'>('DASHBOARD');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isNewSubject, setIsNewSubject] = useState(false);
  const [formData, setFormData] = useState({ subjectIdOrName: '', classCode: '', maxStudents: 50, price: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // States cho 2 tính năng mới
  const [globalSchedule, setGlobalSchedule] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState('0.0');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // --- HỆ THỐNG TOAST NOTIFICATION ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ message: '', type: null });
    }, 3000);
  };

  const [classSearchQuery, setClassSearchQuery] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // -----------------------------------

  const [teacherInfo, setTeacherInfo] = useState({
    fullName: localStorage.getItem('fullName') || 'Giảng viên',
    email: 'Đang tải...',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(localStorage.getItem('fullName') || 'User')}&background=2563eb&color=fff&size=128`
  });

  useEffect(() => {

    const userRole = localStorage.getItem('role');

    if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      setAccessDenied(true);


      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);


      return () => clearTimeout(timer);
    }
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const classRes = await axiosClient.get('/classes/my-classes');
        const myClasses = classRes.data || [];
        if (Array.isArray(myClasses)) setClasses(myClasses);

        const userRes = await axiosClient.get('/users/me');
        const userData = userRes.data;
        let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName || 'User')}&background=2563eb&color=fff&size=128`;
        if (userData.avatarUrl) {
          avatarUrl = userData.avatarUrl.startsWith('http') ? userData.avatarUrl : `${BACKEND_URL}${userData.avatarUrl}`;
        }
        setTeacherInfo({ fullName: userData.fullName || 'Giảng viên', email: userData.email || 'Chưa cập nhật email', avatar: avatarUrl });

        let totalPendingGrading = 0;
        let scheduleItems: any[] = [];

        await Promise.all(
          myClasses.map(async (cls: any) => {
            try {
              // Fetch pending grading
              const gradingRes = await axiosClient.get(`/classes/${cls.id}/pending-submissions`);
              if (Array.isArray(gradingRes.data)) {
                totalPendingGrading += gradingRes.data.length;
              }

              // Fetch activities for schedule
              const detailRes = await axiosClient.get(`/classes/${cls.id}/detail`);
              const sections = detailRes.data.sections || [];
              sections.forEach((sec: any) => {
                sec.activities.forEach((act: any) => {
                  // Nhận diện Kỳ thi (Case-insensitive + check examId)
                  const isExam = act.type?.toUpperCase() === 'EXAM' || !!act.examId;

                  if (isExam) {
                    // Đối với Kỳ thi: Hiện cả mốc Bắt đầu và Kết thúc
                    const startTime = act.exam?.startTime || act.startTime;
                    const endTime = act.exam?.endTime || act.endTime;

                    if (startTime) {
                      scheduleItems.push({
                        ...act,
                        type: 'EXAM_START',
                        className: cls.subjectName,
                        classCode: cls.classCode,
                        date: startTime,
                        title: `[Mở đề] ${act.title}`
                      });
                    }
                    if (endTime) {
                      scheduleItems.push({
                        ...act,
                        type: 'EXAM_END',
                        className: cls.subjectName,
                        classCode: cls.classCode,
                        date: endTime,
                        title: `[Đóng đề] ${act.title}`
                      });
                    }
                  } else if (act.dueDate) {
                    // Đối với Bài tập: Hiện mốc Hạn nộp
                    scheduleItems.push({
                      ...act,
                      type: 'ASSIGNMENT',
                      className: cls.subjectName,
                      classCode: cls.classCode,
                      date: act.dueDate
                    });
                  }
                });
              });
            } catch (err) { }
          })
        );

        setPendingGradingCount(totalPendingGrading);
        scheduleItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setGlobalSchedule(scheduleItems);

        // Fetch reviews
        const reviewRes = await axiosClient.get('/classes/all-reviews');
        setAllReviews(reviewRes.data.reviews || []);
        setAvgRating(reviewRes.data.avgRating || '0.0');

      } catch (error) {
        console.error("Lỗi tải dữ liệu Dashboard:", error);
      } finally { setLoading(false); }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (isModalOpen && subjects.length === 0) {
      axiosClient.get('/subjects').then(res => { setSubjects(res.data); setFormData(prev => ({ ...prev, subjectIdOrName: '' })); })
    } else if (isModalOpen && subjects.length > 0 && !isNewSubject) {
      setFormData(prev => ({ ...prev, subjectIdOrName: '' }));
    }
  }, [isModalOpen, isNewSubject]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectIdOrName.trim() || !formData.classCode.trim()) {
      return showToast("Vui lòng điền đầy đủ thông tin bắt buộc!", "error");
    }
    setIsSubmitting(true);
    try {
      await axiosClient.post('/classes', formData);
      showToast("Tạo lớp học mới thành công!", "success");
      setIsModalOpen(false);
      setFormData({ subjectIdOrName: '', classCode: '', maxStudents: 50, price: 0 });
      const res = await axiosClient.get('/classes/my-classes');
      if (Array.isArray(res.data)) setClasses(res.data);
      setActiveMenu('CLASSES');
    } catch (error: any) {
      showToast(error.response?.data?.message || "Đã xảy ra lỗi khi tạo lớp!", "error");
    } finally { setIsSubmitting(false); }
  };


  const handleCompleteClass = (classId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Đánh dấu kết thúc",
      message: "Bạn có chắc chắn muốn kết thúc lớp học này? Lớp sẽ được chuyển vào mục Đã kết thúc.",
      confirmText: "Kết thúc",
      confirmColor: "#ef4444",
      onConfirm: async () => {
        closeConfirm();
        try {
          await axiosClient.patch(`/classes/${classId}/complete`);
          showToast("Đã kết thúc lớp học!", "success");
          const res = await axiosClient.get('/classes/my-classes');
          if (Array.isArray(res.data)) setClasses(res.data);
        } catch (error) {
          showToast("Lỗi khi kết thúc lớp học", "error");
        }
      }
    });
  };

  const handleReopenClass = (classId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Mở lại lớp học",
      message: "Bạn muốn mở lại lớp học này? Lớp sẽ xuất hiện lại trong danh sách Đang diễn ra.",
      confirmText: "Mở lại",
      confirmColor: "#10b981",
      onConfirm: async () => {
        closeConfirm();
        try {
          await axiosClient.patch(`/classes/${classId}/reopen`);
          showToast("Đã mở lại lớp học!", "success");
          const res = await axiosClient.get('/classes/my-classes');
          if (Array.isArray(res.data)) setClasses(res.data);
        } catch (error) {
          showToast("Lỗi khi mở lại lớp học", "error");
        }
      }
    });
  };

  const filteredClasses = classes.filter(cls => {
    const matchTab = cls.status === activeTab;
    const searchLower = classSearchQuery.toLowerCase();
    const matchSearch = cls.subjectName.toLowerCase().includes(searchLower) ||
      cls.classCode.toLowerCase().includes(searchLower);
    return matchTab && matchSearch;
  });
  const activeCount = classes.filter(c => c.status === 'ACTIVE').length;
  const completedCount = classes.filter(c => c.status === 'COMPLETED').length;
  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
  const totalRevenue = classes.reduce((sum, cls) => sum + (cls.price * cls.studentCount), 0);

  const COLOR_PRIMARY = '#2563eb';
  const COLOR_SECONDARY = '#F8C237';
  const [accessDenied, setAccessDenied] = useState(false);
  const chartData = [{ name: 'Thg 1', visit: 32, join: 62 }, { name: 'Thg 2', visit: 18, join: 36 }, { name: 'Thg 3', visit: 30, join: 10 }, { name: 'Thg 4', visit: 32, join: 37 }, { name: 'Thg 5', visit: 32, join: 48 }, { name: 'Thg 6', visit: 32, join: 10 }, { name: 'Thg 7', visit: 32, join: 28 }, { name: 'Thg 8', visit: 32, join: 23 }, { name: 'Thg 9', visit: 30, join: 56 }, { name: 'Thg 10', visit: 32, join: 23 }, { name: 'Thg 11', visit: 25, join: 50 }, { name: 'Thg 12', visit: 32, join: 65 }];
  const donutData = [{ name: 'Đang mở', value: 60, color: COLOR_SECONDARY }, { name: 'Đã hoàn thành', value: 40, color: COLOR_PRIMARY }];
  const locations = [{ country: 'Hà Nội', pct: 60, students: '2,521' }, { country: 'TP.HCM', pct: 80, students: '3,451' }, { country: 'Đà Nẵng', pct: 50, students: '1,551' }, { country: 'Cần Thơ', pct: 30, students: '1,151' }, { country: 'Hải Phòng', pct: 20, students: '851' }];
  if (accessDenied) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', backgroundColor: '#f8fafc', position: 'fixed', top: 0, left: 0, zIndex: 10000
      }}>

        <FaUserTimes size={80} color="#ef4444" style={{ marginBottom: '24px' }} />
        <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '28px' }}>Truy cập bị từ chối</h1>
        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '16px', textAlign: 'center', maxWidth: '450px', lineHeight: '1.6' }}>
          Rất tiếc! bạn không có quyền truy cập trang web này.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => navigate(`/`)}
            style={{ padding: '12px 30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
          >
            Về trang chủ ngay
          </button>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Hệ thống sẽ tự chuyển hướng sau vài giây...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="teacher-dashboard-container">


      {toast.type && (
        <div className={`td-toast td-toast-${toast.type}`}>
          {toast.type === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div className="td-modal-overlay" style={{ zIndex: 10001 }}>
          <div className="td-modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '40px', color: confirmModal.confirmColor || '#2563eb', marginBottom: '15px' }}>
              <FaQuestionCircle />
            </div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#0f172a' }}>{confirmModal.title}</h2>
            <p style={{ margin: '0 0 25px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>{confirmModal.message}</p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={closeConfirm} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy bỏ</button>
              <button onClick={confirmModal.onConfirm} style={{ padding: '10px 20px', background: confirmModal.confirmColor || '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{confirmModal.confirmText || 'Xác nhận'}</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`td-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="td-logo-section">
          <div className="td-logo" onClick={() => navigate('/')}>
            <FaGraduationCap size={28} /> {!isSidebarCollapsed && <span>EduExam Teacher</span>}
          </div>
          <button className="td-sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <FaBars />
          </button>
        </div>
        <nav className="td-nav">
          <button className={`td-nav-item ${activeMenu === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveMenu('DASHBOARD')}>
            <FaChartPie /> {!isSidebarCollapsed && <span>Bảng điều khiển</span>}
          </button>
          <button className={`td-nav-item ${activeMenu === 'CLASSES' ? 'active' : ''}`} onClick={() => setActiveMenu('CLASSES')}>
            <FaBook /> {!isSidebarCollapsed && <span>Quản lý lớp học</span>}
          </button>
          <button className={`td-nav-item ${activeMenu === 'GRADING' ? 'active' : ''}`} onClick={() => setActiveMenu('GRADING')}>
            <FaFileSignature /> 
            {!isSidebarCollapsed && <span>Bài tập chờ chấm</span>}
            {pendingGradingCount > 0 && <span className="td-nav-badge">{pendingGradingCount}</span>}
          </button>
          <button className={`td-nav-item ${activeMenu === 'SCHEDULE' ? 'active' : ''}`} onClick={() => setActiveMenu('SCHEDULE')}>
            <FaCalendarAlt /> {!isSidebarCollapsed && <span>Lịch biểu tổng thể</span>}
          </button>
          <button className={`td-nav-item ${activeMenu === 'REVIEWS' ? 'active' : ''}`} onClick={() => setActiveMenu('REVIEWS')}>
            <FaComments /> {!isSidebarCollapsed && <span>Đánh giá & Phản hồi</span>}
          </button>
        </nav>
      </aside>

      <main className={`td-main ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ backgroundColor: '#f8fafc' }}>

        {/* === VIEW 1: DASHBOARD (Giữ nguyên) === */}
        {activeMenu === 'DASHBOARD' && (
          <div className="td-dash-wrapper">
            <div className="td-teacher-header">
              <div className="td-teacher-profile">
                <img src={teacherInfo.avatar} alt="Teacher Avatar" className="td-avatar" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherInfo.fullName)}&background=2563eb&color=fff&size=128`; }} />
                <div className="td-teacher-info">
                  <h1>Xin chào, {teacherInfo.fullName}! 👋</h1>
                  <p><FaEnvelope color="#64748b" /> {teacherInfo.email}</p>
                </div>
              </div>
              <div className="td-header-actions">
                <button className="td-btn-outline" onClick={() => { navigate('/profile'); }}><FaEdit /> Cập nhật hồ sơ</button>
              </div>
            </div>

            <div className="td-dash-grid">
              <div className="td-dash-left">
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-left"><div className="kpi-icon-wrap" style={{ color: '#3b82f6' }}><FaBookOpen /></div><div className="kpi-text"><p>Tổng số lớp học</p><h2>{classes.length}</h2></div></div>
                    <div className="kpi-sparkline"><FaChartLine /></div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-left"><div className="kpi-icon-wrap" style={{ color: '#10b981' }}><FaStar /></div><div className="kpi-text"><p>Đánh giá trung bình</p><h2>{avgRating}/5.0</h2></div></div>
                    <div className="kpi-sparkline" style={{ color: '#10b981' }}><FaChartLine /></div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-left"><div className="kpi-icon-wrap" style={{ color: '#8b5cf6' }}><FaUsers /></div><div className="kpi-text"><p>Tổng sinh viên</p><h2>{totalStudents}</h2></div></div>
                    <div className="kpi-sparkline" style={{ color: '#8b5cf6' }}><FaChartLine /></div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-left"><div className="kpi-icon-wrap" style={{ color: '#ef4444' }}><FaDollarSign /></div><div className="kpi-text"><p>Tổng doanh thu</p><h2>{totalRevenue > 0 ? (totalRevenue / 1000000).toFixed(1) + 'tr' : '0'} VNĐ</h2></div></div>
                    <div className="kpi-sparkline" style={{ color: '#ef4444' }}><FaChartLine /></div>
                  </div>
                </div>

                <div className="dash-box">
                  <div className="box-header">
                    <h3 className="box-title">Tương tác hệ thống</h3>
                    <div className="revenue-legend">
                      <span><div className="dot" style={{ backgroundColor: COLOR_PRIMARY }}></div> Sinh viên tham gia</span>
                      <span><div className="dot" style={{ backgroundColor: COLOR_SECONDARY }}></div> Lượt truy cập</span>
                    </div>
                    <select style={{ border: 'none', color: '#64748b', outline: 'none', backgroundColor: 'transparent', fontWeight: 'bold' }}><option>12 Tháng qua</option></select>
                  </div>
                  <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="visit" stackId="a" fill={COLOR_SECONDARY} barSize={12} />
                        <Bar dataKey="join" stackId="a" fill={COLOR_PRIMARY} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bottom-left-grid">
                  <div className="dash-box">
                    <div className="box-header"><h3 className="box-title">Thống kê tuần qua</h3> <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaEllipsisV color="#94a3b8" /></button></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', padding: '0 10px 10px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: '15px', fontWeight: 'bold' }}>
                      <span>Lớp học</span><span>Sinh viên</span><span>Đánh giá</span>
                    </div>
                    <div className="weekly-list">
                      <div className="weekly-item"><div className="w-icon"><FaLayerGroup /></div><div className="w-info"><h4>Lập trình Web Frontend</h4><p>INT3306</p></div><div className="w-sale">10</div><div className="w-earn">4.9 ⭐</div></div>
                      <div className="weekly-item"><div className="w-icon"><FaPaintBrush /></div><div className="w-info"><h4>Cơ sở Dữ liệu</h4><p>INT1301</p></div><div className="w-sale">32</div><div className="w-earn">4.7 ⭐</div></div>
                      <div className="weekly-item"><div className="w-icon"><FaMobileAlt /></div><div className="w-info"><h4>Phát triển ứng dụng Mobile</h4><p>INT3315</p></div><div className="w-sale">12</div><div className="w-earn">5.0 ⭐</div></div>
                    </div>
                  </div>

                  <div className="dash-box">
                    <div className="box-header"><h3 className="box-title">Tỉ lệ lớp học</h3> <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaEllipsisV color="#94a3b8" /></button></div>
                    <div style={{ height: '220px', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} innerRadius={65} outerRadius={90} paddingAngle={0} dataKey="value" stroke="none">
                            {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>60%</div>
                    </div>
                    <div className="donut-legend">
                      <div><div className="dot" style={{ backgroundColor: COLOR_PRIMARY }}></div> <span>Đã hoàn thành<br /><span style={{ color: '#94a3b8', fontSize: '10px' }}>40% Hệ thống</span></span></div>
                      <div><div className="dot" style={{ backgroundColor: COLOR_SECONDARY }}></div> <span>Đang mở<br /><span style={{ color: '#94a3b8', fontSize: '10px' }}>60% Hệ thống</span></span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="td-dash-right">
                <div className="dash-box">
                  <h3 className="box-title" style={{ marginBottom: '20px' }}>Lớp học nổi bật</h3>
                  <div className="course-list">
                    <div className="course-item"><div className="c-icon" style={{ backgroundColor: '#f24e1e' }}><FaFigma /></div><div className="c-info"><h4>Lập trình Web Cơ bản</h4><p>2 tháng trước</p></div><div className="c-views"><FaUsers /> 1,440</div></div>
                    <div className="course-item"><div className="c-icon" style={{ backgroundColor: COLOR_SECONDARY }}><FaLayerGroup /></div><div className="c-info"><h4>Cấu trúc dữ liệu và Giải thuật</h4><p>3 tháng trước</p></div><div className="c-views"><FaUsers /> 2,120</div></div>
                    <div className="course-item"><div className="c-icon" style={{ backgroundColor: COLOR_PRIMARY }}><FaPaintBrush /></div><div className="c-info"><h4>Toán Rời Rạc</h4><p>2 tháng trước</p></div><div className="c-views"><FaUsers /> 1,840</div></div>
                  </div>
                </div>

                <div className="dash-box">
                  <div className="box-header"><h3 className="box-title">Thống kê nhanh</h3> <div className="kpi-sparkline" style={{ fontSize: '24px' }}><FaChartLine /></div></div>
                  <div className="earn-stats">
                    <div className="e-col"><span>SV Trực tuyến</span><h3>150</h3></div>
                    <div className="e-col"><span>Bài chờ chấm</span><h3 style={{ color: COLOR_SECONDARY }}>{pendingGradingCount}</h3></div>
                    <div className="e-col"><span>Lớp đang mở</span><h3>{activeCount}</h3></div>
                  </div>
                  <div className="withdraw-box">
                    <div className="w-avail"><span>Đang hoạt động</span><h2>167 lớp</h2></div>
                    <button className="btn-withdraw" onClick={() => setActiveMenu('CLASSES')}>Chi tiết</button>
                  </div>
                </div>

                <div className="dash-box">
                  <h3 className="box-title" style={{ marginBottom: '30px' }}>Phân bố sinh viên</h3>
                  <div className="loc-list">
                    {locations.map((loc, i) => (
                      <div key={i} className="loc-item-wrap">
                        <span className="loc-label" style={{ left: `${loc.pct}%`, transform: 'translateX(-50%)' }}>{loc.pct}%</span>
                        <div className="loc-bar">
                          <div className="loc-fill-primary" style={{ width: `${loc.pct}%` }}>{loc.country}</div>
                          <div className="loc-fill-secondary" style={{ width: `${100 - loc.pct}%` }}><FaUsers style={{ marginRight: '6px' }} /> {loc.students}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* === VIEW 2: QUẢN LÝ LỚP HỌC (ĐÃ THÊM ẢNH COVER) === */}

        {activeMenu === 'CLASSES' && (
          <div style={{ padding: '20px' }}>
            <header className="td-header">
              <div><h1 style={{ margin: 0 }}>Danh sách lớp học</h1><p style={{ marginTop: '5px', color: '#64748b' }}>Quản lý các môn học đang giảng dạy</p></div>
              <button className="td-add-btn" onClick={() => setIsModalOpen(true)}><FaPlus /> Tạo lớp học mới</button>
            </header>

            {/* KHU VỰC ĐIỀU HƯỚNG VÀ TÌM KIẾM */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>

              {/* TABS */}
              <div className="td-tabs-container" style={{ marginBottom: 0 }}>
                <button className={`td-tab-pill ${activeTab === 'ACTIVE' ? 'active' : ''}`} onClick={() => setActiveTab('ACTIVE')}><FaPlayCircle /> Đang diễn ra ({activeCount})</button>
                <button className={`td-tab-pill ${activeTab === 'COMPLETED' ? 'active' : ''}`} onClick={() => setActiveTab('COMPLETED')}><FaCheckCircle /> Đã kết thúc ({completedCount})</button>
              </div>

              {/* THANH TÌM KIẾM */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên môn hoặc mã lớp..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 15px 10px 40px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    outline: 'none', fontSize: '14px', backgroundColor: 'white'
                  }}
                />
                <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

            </div>

            {loading ? (
              <div className="loader">Đang tải...</div>
            ) : filteredClasses.length > 0 ? (
              <div className="td-course-grid">
                {filteredClasses.map((cls) => {
                  const isActive = cls.status === 'ACTIVE';
                  const isFull = cls.studentCount >= cls.maxStudents;
                  const isFree = cls.price === 0;
                  const displayPrice = isFree ? "Miễn phí" : cls.price.toLocaleString('vi-VN') + ' đ';

                  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                  // Xử lý ảnh thật
                  const finalCoverUrl = cls.coverImageUrl
                    ? (cls.coverImageUrl.startsWith('http') ? cls.coverImageUrl : `${BACKEND_URL}${cls.coverImageUrl}`)
                    : DEFAULT_COVER_IMAGE;

                  return (
                    <div key={cls.id} className="td-course-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {/* KHU VỰC ẢNH COVER */}
                      <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                        <img src={finalCoverUrl} alt={cls.subjectName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span className={`td-status ${isActive ? 'active' : 'completed'}`} style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: isActive ? '#10b981' : '#64748b', color: 'white', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                          {isActive ? 'Đang diễn ra' : 'Đã kết thúc'}
                        </span>
                      </div>

                      {/* NỘI DUNG CARD */}
                      <div style={{ padding: '20px' }}>
                        <h3 title={cls.subjectName} style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.subjectName}</h3>

                        <div className="td-card-body" style={{ padding: 0, border: 'none' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Mã lớp:</span> <strong style={{ color: '#0f172a' }}>{cls.classCode}</strong>
                          </p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaUserFriends color={isFull ? "#ef4444" : "#64748b"} /> Sĩ số:</span>
                            <strong style={{ color: isFull ? "#ef4444" : "#0f172a" }}>{cls.studentCount} / {cls.maxStudents}</strong>
                          </p>

                          <p style={{ margin: '0', fontSize: '13px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaTag color={isFree ? '#10b981' : '#f59e0b'} /> Mức phí:</span>
                            <strong style={{ color: isFree ? '#10b981' : '#f59e0b', fontSize: '15px' }}>{displayPrice}</strong>
                          </p>
                        </div>

                        <div className="td-card-footer" style={{ borderTop: '1px solid #f1f5f9', marginTop: '20px', paddingTop: '15px', paddingBottom: 0, paddingLeft: 0, paddingRight: 0, display: 'flex', gap: '10px' }}>
                          <button className="td-icon-btn edit" onClick={() => navigate(`/teacher/class/${cls.id}`)} style={{ flex: 1, justifyContent: 'center' }}><FaEdit /> Quản lý lớp học</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Không tìm thấy lớp học nào.</div>}
          </div>
        )}

        {activeMenu === 'GRADING' && (
          <TeacherGrading />
        )}

        {activeMenu === 'SCHEDULE' && (
          <div style={{ display: 'flex', height: 'calc(100vh - 80px)', backgroundColor: 'white', overflow: 'hidden', fontFamily: '"Roboto", "Arial", sans-serif' }}>
            <div style={{ width: '280px', borderRight: '1px solid #dadce0', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ padding: '0 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#3c4043', marginLeft: '8px' }}>
                    Tháng {currentCalendarDate.getMonth() + 1}, {currentCalendarDate.getFullYear()}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="gc-nav-btn" onClick={() => { const d = new Date(currentCalendarDate); d.setMonth(d.getMonth() - 1); setCurrentCalendarDate(d); }}><FaChevronRight style={{ transform: 'rotate(180deg)', fontSize: '12px' }} /></button>
                    <button className="gc-nav-btn" onClick={() => { const d = new Date(currentCalendarDate); d.setMonth(d.getMonth() + 1); setCurrentCalendarDate(d); }}><FaChevronRight style={{ fontSize: '12px' }} /></button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', color: '#70757a', fontWeight: 500, marginBottom: '8px' }}>
                  {['Cn', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                  {(() => {
                    const days = [];
                    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();
                    const lastDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
                    const prevLastDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 0).getDate();
                    for (let i = firstDay; i > 0; i--) days.push({ d: prevLastDate - i + 1, current: false, monthOffset: -1 });
                    for (let i = 1; i <= lastDate; i++) days.push({ d: i, current: true, monthOffset: 0 });
                    const remain = 42 - days.length;
                    for (let i = 1; i <= remain; i++) days.push({ d: i, current: false, monthOffset: 1 });

                    return days.map((day, idx) => {
                      const dateObj = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + day.monthOffset, day.d);
                      const isToday = dateObj.toDateString() === new Date().toDateString();
                      return (
                        <div key={idx}
                          className="gc-day-cell"
                          onClick={() => setCurrentCalendarDate(dateObj)}
                          style={{
                            height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', borderRadius: '50%', cursor: 'pointer',
                            backgroundColor: isToday ? '#1a73e8' : 'transparent',
                            color: isToday ? 'white' : (day.current ? '#3c4043' : '#dadce0'),
                            fontWeight: isToday ? 700 : 400
                          }}>
                          {day.d}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <header style={{ height: '64px', borderBottom: '1px solid #dadce0', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                <button
                  className="gc-today-btn"
                  onClick={() => setCurrentCalendarDate(new Date())}
                  style={{ padding: '8px 24px', border: '1px solid #dadce0', background: 'white', borderRadius: '24px', fontSize: '14px', fontWeight: 500, color: '#3c4043', cursor: 'pointer', marginRight: '24px' }}
                >Hôm nay</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '24px' }}>
                  <button className="gc-nav-btn main" onClick={() => { const d = new Date(currentCalendarDate); d.setDate(d.getDate() - 7); setCurrentCalendarDate(d); }}><FaChevronRight style={{ transform: 'rotate(180deg)', fontSize: '14px', color: '#5f6368' }} /></button>
                  <button className="gc-nav-btn main" onClick={() => { const d = new Date(currentCalendarDate); d.setDate(d.getDate() + 7); setCurrentCalendarDate(d); }}><FaChevronRight style={{ fontSize: '14px', color: '#5f6368' }} /></button>
                </div>
                <span style={{ fontSize: '22px', color: '#3c4043' }}>Tháng {currentCalendarDate.getMonth() + 1}, {currentCalendarDate.getFullYear()}</span>

              </header>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #dadce0', paddingRight: '15px' }}>
                  <div style={{ width: '80px', flexShrink: 0, borderRight: '1px solid #dadce0', padding: '10px', fontSize: '11px', color: '#70757a', textAlign: 'center', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>GMT+07</div>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {(() => {
                      const weekDays = [];
                      const pivot = new Date(currentCalendarDate);
                      const dayOfWeek = pivot.getDay();
                      const startOfWeek = new Date(pivot);
                      startOfWeek.setDate(pivot.getDate() - dayOfWeek);
                      const dayNames = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
                      for (let i = 0; i < 7; i++) {
                        const d = new Date(startOfWeek);
                        d.setDate(startOfWeek.getDate() + i);
                        const isToday = d.toDateString() === new Date().toDateString();
                        weekDays.push(
                          <div key={i} style={{ padding: '12px 0', textAlign: 'center', borderRight: '1px solid #dadce0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 500, color: isToday ? '#1a73e8' : '#70757a', marginBottom: '8px' }}>{dayNames[d.getDay()]}</span>
                            <span style={{ fontSize: '24px', fontWeight: 400, color: isToday ? 'white' : '#3c4043', backgroundColor: isToday ? '#1a73e8' : 'transparent', width: '44px', height: '44px', lineHeight: '44px', borderRadius: '50%' }}>{d.getDate()}</span>
                          </div>
                        );
                      }
                      return weekDays;
                    })()}
                  </div>
                </div>
                {/* Time Slots Grid (Scrollable) */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', position: 'relative' }}>
                  {/* Left Time Column */}
                  <div style={{ width: '80px', flexShrink: 0, borderRight: '1px solid #dadce0', backgroundColor: 'white' }}>
                    {[...Array(24)].map((_, i) => {
                      const hour = i;
                      let displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      return (
                        <div key={i} style={{ height: '48px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '-10px', right: '10px', fontSize: '10px', color: '#70757a' }}>
                            {displayHour} {ampm}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Main Grid Body */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', position: 'relative', minHeight: '1152px' }}>
                    {/* Horizontal Lines (Background) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                      {[...Array(24)].map((_, i) => (
                        <div key={i} style={{ height: '48px', borderBottom: '1px solid #f1f3f4' }}></div>
                      ))}
                    </div>

                    {/* Day Columns (Foreground) */}
                    {[...Array(7)].map((_, i) => (
                      <div key={i} style={{ borderRight: '1px solid #dadce0', position: 'relative', height: '100%' }}>
                        {(() => {
                          const pivot = new Date(currentCalendarDate);
                          const dayOfWeek = pivot.getDay();
                          const startOfWeek = new Date(pivot);
                          startOfWeek.setDate(pivot.getDate() - dayOfWeek);
                          const d = new Date(startOfWeek);
                          d.setDate(startOfWeek.getDate() + i);

                          const dayEvents = globalSchedule.filter(e => new Date(e.date).toDateString() === d.toDateString());
                          return dayEvents.map((ev, evIdx) => {
                            const date = new Date(ev.date);
                            const hours = date.getHours();
                            const minutes = date.getMinutes();
                            // Mỗi 1h tương ứng 48px
                            const top = (hours * 48) + (minutes / 60 * 48);

                            // Xác định màu sắc và nhãn theo loại
                            let bgColor = '#f9ab00'; // Mặc định ASSIGNMENT
                            let label = 'Hạn nộp bài';
                            if (ev.type === 'EXAM_START') {
                              bgColor = '#1e8e3e';
                              label = 'Mở đề thi';
                            } else if (ev.type === 'EXAM_END') {
                              bgColor = '#d93025';
                              label = 'Thời gian đóng đề';
                            }

                            return (
                              <div key={evIdx} onClick={() => navigate(`/teacher/activity/${ev.id}`)} style={{
                                position: 'absolute', top: `${top}px`, left: '4px', right: '4px',
                                minHeight: '50px', backgroundColor: bgColor,
                                color: 'white', borderRadius: '4px', padding: '6px 8px', fontSize: '10px',
                                fontWeight: 500, zIndex: 10, cursor: 'pointer', overflow: 'hidden',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '3px'
                              }}>
                                <div style={{ fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  Lớp {ev.className}
                                </div>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.95 }}>
                                  {ev.title}
                                </div>
                                <div style={{ fontSize: '9px', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }}>
                                    {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                                  </span>
                                  {label}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'REVIEWS' && (
          <div style={{ padding: '24px' }}>
            <header className="td-header" style={{ marginBottom: '32px' }}>
              <div><h1 style={{ margin: 0 }}>Đánh giá của học viên</h1><p style={{ marginTop: '5px', color: '#64748b' }}>Dựa trên {allReviews.length} phản hồi từ các lớp học</p></div>
              <div style={{ backgroundColor: 'white', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Trung bình</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>{avgRating} ⭐</div>
              </div>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {allReviews.map((rev, index) => (
                <div key={index} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <img src={rev.student?.avatarUrl ? `${BACKEND_URL}${rev.student.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.student?.fullName || 'User')}&background=random`} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.student?.fullName || 'User')}&background=random`; }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{rev.student?.fullName}</h4>
                      <div style={{ color: '#f59e0b', fontSize: '12px' }}>{'⭐'.repeat(rev.rating)}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', fontStyle: 'italic' }}>"{rev.comment}"</p>
                  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #e2e8f0', fontSize: '12px', color: '#94a3b8' }}>
                    Đánh giá cho lớp: <strong style={{ color: '#6366f1' }}>{rev.class?.subject?.name} ({rev.class?.classCode})</strong>
                  </div>
                </div>
              ))}
              {allReviews.length === 0 && <div style={{ textAlign: 'center', gridColumn: '1/3', padding: '60px', color: '#64748b' }}>Chưa có đánh giá nào từ sinh viên.</div>}
            </div>
          </div>
        )}

      </main>

      {/* MODAL TẠO LỚP */}
      {isModalOpen && (
        <div className="td-modal-overlay">
          <div className="td-modal-content">
            <div className="td-modal-header">
              <h2 style={{ margin: 0 }}>Tạo lớp học mới</h2>
              <button className="td-modal-close" onClick={() => setIsModalOpen(false)}><FaTimes /></button>
            </div>

            <form onSubmit={handleCreateClass} className="td-modal-body" style={{ padding: '20px' }}>
              <div className="td-form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontWeight: 'bold' }}>
                  <span>Môn học <span style={{ color: 'red' }}>*</span></span>
                  <button type="button" onClick={() => { setIsNewSubject(!isNewSubject); setFormData({ ...formData, subjectIdOrName: '' }); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textDecoration: 'underline' }}>{isNewSubject ? 'Chọn môn có sẵn' : '+ Thêm môn học mới'}</button>
                </label>
                {isNewSubject ? (
                  <input type="text" placeholder="Nhập tên môn học mới" value={formData.subjectIdOrName} onChange={(e) => setFormData({ ...formData, subjectIdOrName: e.target.value })} required autoFocus style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                ) : (
                  <select value={formData.subjectIdOrName} onChange={(e) => setFormData({ ...formData, subjectIdOrName: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    <option value="" disabled>-- Chọn một môn học --</option>
                    {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                )}
              </div>
              <div className="td-form-group" style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Mã lớp <span style={{ color: 'red' }}>*</span></label><input type="text" placeholder="Nhập mã lớp" value={formData.classCode} onChange={(e) => setFormData({ ...formData, classCode: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} /></div>
              <div className="td-form-group" style={{ marginBottom: '15px' }}><label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Sĩ số tối đa <span style={{ color: 'red' }}>*</span></label><input type="number" min="1" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 1 })} required style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} /></div>

              <div className="td-form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Giá khóa học (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Nhập 0 nếu miễn phí"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                    style={{ width: '100%', padding: '10px 40px 10px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <span style={{ position: 'absolute', right: '15px', top: '10px', color: '#64748b', fontWeight: 'bold' }}>₫</span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Mẹo: Nhập 0 để sinh viên có thể tham gia miễn phí ngay lập tức.</p>
              </div>

              <div className="td-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isSubmitting ? 'Đang tạo...' : 'Tạo lớp ngay'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}