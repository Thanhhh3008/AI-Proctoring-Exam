import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { 
  FaBookOpen, FaUsers, FaChartBar, FaChevronDown, 
  FaChevronUp, FaGlobe, FaFileAlt, FaFileUpload, FaCheckSquare, 
  FaHome, FaChevronRight, FaPlusCircle, FaTimes,
  FaUserCheck, FaUserTimes, FaClock, FaCog, FaTrash, FaUserGraduate,
  FaEdit, FaChevronLeft, FaSearch, FaDownload, FaInfoCircle,
  FaDatabase, FaEllipsisV // <-- Import thêm icon cho Ngân hàng
} from 'react-icons/fa';
import './TeacherCourseDetail.css'; 

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getActivityDisplayProps = (type: string) => {
  switch (type) {
    case 'FILE': return { typeName: 'TẬP TIN', icon: <FaFileAlt size={24} />, color: '#0ea5e9', isAIExam: false };
    case 'URL': return { typeName: 'URL', icon: <FaGlobe size={24} />, color: '#3b82f6', isAIExam: false };
    case 'ASSIGNMENT': return { typeName: 'BÀI TẬP', icon: <FaFileUpload size={24} />, color: '#ec4899', isAIExam: false };
    case 'EXAM': return { typeName: 'BÀI KIỂM TRA', icon: <FaCheckSquare size={24} />, color: '#f43f5e', isAIExam: true };
    default: return { typeName: 'HỌC LIỆU', icon: <FaFileAlt size={24} />, color: '#64748b', isAIExam: false };
  }
};

export default function TeacherCourseDetail() {
  const { classId } = useParams(); 
  const navigate = useNavigate();
 
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('khoahoc');
  const [loading, setLoading] = useState(true);

  // States cho Thành viên

const [accessDenied, setAccessDenied] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // States cho Bảng điểm
  const [gradesData, setGradesData] = useState<any>(null);
  const [gradeSearchQuery, setGradeSearchQuery] = useState('');
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradePage, setGradePage] = useState(1);
  const GRADE_PAGE_SIZE = 15;

  // ==============================================
  // STATES MỚI CHO NGÂN HÀNG CÂU HỎI
  // ==============================================
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // States Quản lý Chủ đề
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');

  // States Tạo hoạt động
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'FILE', title: '' });

  // States Modal Từ chối
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectStudentId, setRejectStudentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // States Generic Confirm/Success Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', confirmText: 'Xác nhận', isSuccess: false, onConfirm: () => {}
  });

  const fetchCourseData = async () => {
    try {
      if (!classId) return;
      const res = await axiosClient.get(`/classes/${classId}/detail`);
      setCourseInfo(res.data.course);
      const formattedSections = res.data.sections?.map((sec: any) => ({ ...sec, isOpen: true })) || [];
      setSections(formattedSections);
    } catch (error: any) {
      console.error("Lỗi lấy thông tin:", error);
      
      // BẮT LỖI 403 FORBIDDEN
      if (error.response && error.response.status === 403) {
        setAccessDenied(true); // Kích hoạt màn hình chặn
        
        // Tự động chuyển hướng sau 3 giây
        setTimeout(() => {
          navigate(`/available-classes/${classId}`);
        }, 3000);
      } else {
        // Các lỗi khác như 404 hoặc 500
        navigate('/teacher-dashboard');
      }
    } finally {
      setLoading(false);
    }
  };
  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await axiosClient.get(`/classes/${classId}/members?limit=1000`);
      const memberList = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const studentsOnly = memberList.filter((m: any) => m.role === 'STUDENT');
      setMembers(studentsOnly);
    } catch (error) {
      console.error("Lỗi lấy danh sách sinh viên:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchGradebook = async () => {
    setLoadingGrades(true);
    try {
      const res = await axiosClient.get(`/classes/${classId}/gradebook?limit=1000`);
      setGradesData(res.data);
    } catch (error) {
      console.error("Lỗi lấy bảng điểm:", error);
    } finally {
      setLoadingGrades(false);
    }
  };

  // Hàm tải danh sách Ngân hàng
 const fetchQuestionBanks = async () => {
    setLoadingBanks(true);
    try {
      // Gọi API GET /classes/:classId/question-banks
      const res = await axiosClient.get(`/classes/${classId}/question-banks`);
      setQuestionBanks(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách ngân hàng câu hỏi:", error);
      alert("Không thể tải danh sách Ngân hàng câu hỏi!");
    } finally {
      setLoadingBanks(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchCourseData();
    
    // Xử lý chuyển tab qua URL param ?tab=...
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [classId, navigate, location.search]);

  useEffect(() => {
    if (activeTab === 'thanhvien' && members.length === 0) fetchMembers();
    if (activeTab === 'diemso') fetchGradebook(); 
    if (activeTab === 'nganhang' && questionBanks.length === 0) fetchQuestionBanks(); 
  }, [activeTab]);

  // Đóng dropdown menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset trang khi search
  useEffect(() => { setCurrentPage(1); }, [memberSearchQuery]);
  useEffect(() => { setGradePage(1); }, [gradeSearchQuery]);

 const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    setIsSubmittingBank(true);
    try {
      // Gọi API POST /classes/:classId/question-banks
      await axiosClient.post(`/classes/${classId}/question-banks`, { name: newBankName.trim() });
      
      setNewBankName('');
      setIsBankModalOpen(false);
      
      // Load lại danh sách sau khi tạo thành công
      fetchQuestionBanks();
    } catch (error) {
      alert("Lỗi khi tạo Ngân hàng câu hỏi!");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // 3. Hàm xóa Ngân hàng (GỌI API THẬT)
  const confirmDeleteBank = (bankId: string, bankName: string) => {
    setConfirmModal({
      isOpen: true, isSuccess: false,
      title: 'Xóa ngân hàng câu hỏi',
      message: `Bạn có chắc chắn muốn xóa ngân hàng "${bankName}"? TOÀN BỘ câu hỏi bên trong cũng sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác!`,
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        try {
          // Gọi API DELETE /question-banks/:bankId
          await axiosClient.delete(`/question-banks/${bankId}`);
          
          setConfirmModal({
            isOpen: true, isSuccess: true, title: 'Thành công',
            message: `Đã xóa ngân hàng "${bankName}".`,
            confirmText: 'Đóng', onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
          });
          
          // Load lại danh sách sau khi xóa
          fetchQuestionBanks();
        } catch (error: any) {
          setConfirmModal({
            isOpen: true,
            isSuccess: false,
            title: 'Lỗi xóa ngân hàng',
            message: error.response?.data?.message || "Đã xảy ra lỗi khi xóa ngân hàng!",
            confirmText: 'Đóng',
            onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
          });
        }
      }
    });
  };

  // ==============================================
  // LOGIC CHỦ ĐỀ
  // ==============================================
  const toggleSection = (sectionId: string) => {
    setSections(sections.map(sec => sec.id === sectionId ? { ...sec, isOpen: !sec.isOpen } : sec));
  };
  const collapseAll = () => setSections(sections.map(sec => ({ ...sec, isOpen: false })));

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      await axiosClient.post(`/classes/${classId}/sections`, { title: newSectionTitle });
      setNewSectionTitle('');
      setIsAddingSection(false);
      fetchCourseData(); 
    } catch (error) {
      alert("Lỗi khi thêm chủ đề!");
    }
  };

  const handleUpdateSection = async () => {
    if (!editSectionTitle.trim() || !editSectionId) return;
    try {
      await axiosClient.put(`/classes/${classId}/sections/${editSectionId}`, { title: editSectionTitle });
      setEditSectionId(null);
      setEditSectionTitle('');
      fetchCourseData();
    } catch (error) {
      alert("Lỗi khi cập nhật tên chủ đề!");
    }
  };

  const confirmDeleteSection = (sectionId: string, sectionTitle: string) => {
    setConfirmModal({
      isOpen: true, isSuccess: false,
      title: 'Xóa chủ đề',
      message: `Bạn có chắc chắn muốn xóa chủ đề "${sectionTitle}"? Toàn bộ tài liệu và bài tập trong chủ đề này cũng sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/classes/${classId}/sections/${sectionId}`);
          setConfirmModal({
            isOpen: true, isSuccess: true, title: 'Thành công',
            message: `Đã xóa chủ đề "${sectionTitle}" thành công.`,
            confirmText: 'Đóng', onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
          });
          fetchCourseData();
        } catch (error) {
          alert("Lỗi khi xóa chủ đề!");
        }
      }
    });
  };

  // ==============================================
  // LOGIC TẠO HOẠT ĐỘNG
  // ==============================================
  const openActivityModal = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setActivityForm({ type: 'FILE', title: '' });
    setIsActivityModalOpen(true);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;
    setIsSubmittingActivity(true);
    try {
      await axiosClient.post('/activities', {
        sectionId: selectedSectionId,
        type: activityForm.type,
        title: activityForm.title
      });
      setIsActivityModalOpen(false);
      fetchCourseData(); 
    } catch (error) {
      alert("Lỗi khi tạo hoạt động!");
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  // ==============================================
  // LOGIC THÀNH VIÊN
  // ==============================================



  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!rejectStudentId) return;
    setIsSubmittingReject(true);
    try {
      await axiosClient.post(`/classes/${classId}/reject/${rejectStudentId}`, {
        reason: rejectReason.trim() || 'Yêu cầu không phù hợp với quy định của lớp học.'
      });
      setIsRejectModalOpen(false); 
      setConfirmModal({
        isOpen: true, isSuccess: true, title: 'Thành công',
        message: `Đã từ chối yêu cầu và gửi email lý do cho sinh viên.`,
        confirmText: 'Đóng', onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
      });
      fetchCourseData(); 
    } catch (error) {
      alert("Lỗi khi thực hiện thao tác từ chối!");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const confirmRemoveStudent = (studentId: string, studentName: string) => {
    setConfirmModal({
      isOpen: true, isSuccess: false,
      title: 'Xóa sinh viên khỏi lớp',
      message: `Bạn có chắc chắn muốn xóa sinh viên "${studentName}" khỏi lớp học này? Dữ liệu bài làm của sinh viên này có thể bị mất.`,
      confirmText: 'Xóa sinh viên',
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/classes/${classId}/members/${studentId}`);
          setConfirmModal({
            isOpen: true, isSuccess: true, title: 'Thành công',
            message: `Đã xóa sinh viên "${studentName}" khỏi lớp và gửi email thông báo.`,
            confirmText: 'Đóng', onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
          });
          fetchMembers(); 
        } catch (error) {
          alert("Lỗi khi xóa sinh viên khỏi lớp!");
        }
      }
    });
  };
const confirmCompleteClass = () => {
    setConfirmModal({
      isOpen: true, 
      isSuccess: false,
      title: 'Kết thúc lớp học',
      message: 'Bạn có chắc chắn muốn kết thúc và lưu trữ lớp học này? Sinh viên sẽ không thể nộp bài tập hay tham gia bài thi mới. Hành động này không thể hoàn tác.',
      confirmText: 'Xác nhận kết thúc',
      onConfirm: async () => {
        try {
          await axiosClient.patch(`/classes/${classId}/complete`);
          setConfirmModal({
            isOpen: true, 
            isSuccess: true, 
            title: 'Thành công',
            message: 'Lớp học đã được đánh dấu hoàn thành và lưu trữ an toàn.',
            confirmText: 'Đóng', 
            onConfirm: () => {
              setConfirmModal(prev => ({...prev, isOpen: false}));
              fetchCourseData(); // Tải lại để cập nhật trạng thái
            }
          });
        } catch (error: any) {
          alert(error.response?.data?.message || "Lỗi khi kết thúc lớp học!");
        }
      }
    });
  };
  // ==============================================
  // XUẤT EXCEL (CSV)
  // ==============================================
  const exportToCSV = () => {
    if (!gradesData || !gradesData.students || gradesData.students.length === 0) return;

    const activities = gradesData.activities || [];
    
    // Tạo Header
    let csvContent = "Họ và Tên,Email,";
    activities.forEach((act: any) => {
      csvContent += `"${act.title} (${act.weight}%)",`;
    });
    csvContent += "Điểm tổng kết,Xếp loại\n";

    // Tạo Data
    const studentsList = gradesData.students;
    studentsList.forEach((student: any) => {
      let row = `"${student.fullName}","${student.email}",`;
      
      activities.forEach((act: any) => {
        const score = student.scores?.[act.id];
        row += `"${score !== undefined && score !== null ? Number(score).toFixed(1) : ''}",`;
      });

      row += `"${student.finalScore !== null ? Number(student.finalScore).toFixed(1) : ''}","${student.letterGrade}"\n`;
      csvContent += row;
    });

    // Tạo và tải file
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `BangDiem_${courseInfo?.classCode || 'LopHoc'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
// ==============================================
  // STATES CHO TAB CÀI ĐẶT
  // ==============================================
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    price: 0,
    maxStudents: 50,
  });
  
  // State xử lý ảnh cover
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

// Đồng bộ dữ liệu vào form khi courseInfo được tải xong
  useEffect(() => {
    if (courseInfo) {
      setSettingsForm({
      
        price: courseInfo.price || 0, 
        maxStudents: courseInfo.maxStudents,
      });
      
      // Xử lý đường dẫn ảnh cho chuẩn (có http hoặc ghép từ BACKEND_URL)
      if (courseInfo.coverImageUrl) {
        const finalCoverUrl = courseInfo.coverImageUrl.startsWith('http') 
          ? courseInfo.coverImageUrl 
          : `${BACKEND_URL}${courseInfo.coverImageUrl}`;
        setCoverImagePreview(finalCoverUrl);
      }
    }
  }, [courseInfo]);

  // Xử lý chọn ảnh mới
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Kiểm tra dung lượng (giới hạn 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file)); // Hiển thị ảnh preview
    }
  };

 // Gọi API cập nhật thông tin lớp
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra tính hợp lệ của giá tiền trước khi gửi
    if (settingsForm.price < 0) {
      setConfirmModal({
        isOpen: true, 
        isSuccess: false, 
        title: 'Lỗi thông tin',
        message: 'Giá khóa học không được nhỏ hơn 0 VNĐ.',
        confirmText: 'Đóng', 
        onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
      });
      return;
    }

    setIsUpdatingSettings(true);
    
    try {
      const formData = new FormData();
      // 2. Gửi price thay vì isPublic
      formData.append('price', String(settingsForm.price)); 
      formData.append('maxStudents', String(settingsForm.maxStudents));
      
      if (coverImageFile) {
        formData.append('coverImage', coverImageFile);
      }

      await axiosClient.put(`/classes/${classId}/settings`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setConfirmModal({
        isOpen: true, 
        isSuccess: true, 
        title: 'Thành công',
        message: 'Đã cập nhật cài đặt lớp học.',
        confirmText: 'Đóng', 
        onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
      });
      
      fetchCourseData(); // Tải lại dữ liệu mới từ Server
    } catch (error: any) {
    
      setConfirmModal({
        isOpen: true, 
        isSuccess: false, 
        title: 'Cập nhật thất bại',
        message: error.response?.data?.message || "Đã xảy ra lỗi khi lưu cài đặt lớp học!",
        confirmText: 'Đóng', 
        onConfirm: () => setConfirmModal(prev => ({...prev, isOpen: false}))
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };
  // ==============================================
  // PHÂN TRANG VÀ TÌM KIẾM
  // ==============================================
  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );
  const totalMemberPages = Math.ceil(filteredMembers.length / PAGE_SIZE);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const studentsList = gradesData?.students || [];
  const filteredGrades = studentsList.filter((s: any) => 
    s.fullName.toLowerCase().includes(gradeSearchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(gradeSearchQuery.toLowerCase())
  );
  const totalGradePages = Math.ceil(filteredGrades.length / GRADE_PAGE_SIZE);
  const paginatedGrades = filteredGrades.slice((gradePage - 1) * GRADE_PAGE_SIZE, gradePage * GRADE_PAGE_SIZE);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#64748b' }}>Đang tải dữ liệu lớp học...</div>;
if (accessDenied) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        height: '100vh', width: '100vw', backgroundColor: '#f8fafc', position: 'fixed', top: 0, left: 0, zIndex: 10000 
      }}>
        
        <FaUserTimes size={80} color="#ef4444" style={{ marginBottom: '24px' }} />
        <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '28px' }}>Truy cập bị từ chối</h1>
        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '16px', textAlign: 'center', maxWidth: '450px', lineHeight: '1.6' }}>
          Rất tiếc! Chỉ có giảng viên phụ trách trực tiếp mới có quyền quản lý nội dung của lớp học này.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => navigate(`/available-classes/${classId}`)} 
            style={{ padding: '12px 30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
          >
            Về trang giới thiệu ngay
          </button>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Hệ thống sẽ tự chuyển hướng sau vài giây...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="cd-container">
      
      {confirmModal.isOpen && (
        <div className="td-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="td-modal-content" style={{ maxWidth: '400px' }}>
            <div className="td-modal-header" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '15px' }}>
              <h2 style={{ color: confirmModal.isSuccess ? '#16a34a' : '#dc2626', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {confirmModal.isSuccess && <FaCheckSquare />} {confirmModal.title}
              </h2>
              <button className="td-modal-close" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}><FaTimes /></button>
            </div>
            <div className="td-modal-body" style={{ paddingTop: '20px' }}>
              <p style={{ color: '#475569', lineHeight: '1.5', marginBottom: '25px' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {!confirmModal.isSuccess && (
                  <button className="td-btn-cancel" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>Hủy bỏ</button>
                )}
                <button 
                  className="td-btn-submit" 
                  style={{ backgroundColor: confirmModal.isSuccess ? '#16a34a' : '#dc2626' }} 
                  onClick={confirmModal.onConfirm}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO NGÂN HÀNG MỚI */}
      {isBankModalOpen && (
        <div className="td-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="td-modal-content" style={{ maxWidth: '500px' }}>
            <div className="td-modal-header">
              <h2>Tạo Ngân hàng câu hỏi mới</h2>
              <button className="td-modal-close" onClick={() => setIsBankModalOpen(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleCreateBank} className="td-modal-body">
              <div className="td-form-group">
                <label>Tên Ngân hàng <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Ôn tập Chương 1, Đề thi thử..." 
                  value={newBankName} 
                  onChange={(e) => setNewBankName(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '8px' }} 
                  autoFocus
                />
              </div>
              <div className="td-modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="td-btn-cancel" onClick={() => setIsBankModalOpen(false)}>Hủy</button>
                <button type="submit" className="td-btn-submit" disabled={isSubmittingBank}>
                  {isSubmittingBank ? 'Đang tạo...' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="cd-header-area">
        <div className="cd-breadcrumb">
          <Link to="/teacher-dashboard" className="cd-breadcrumb-link"><FaHome /> Bảng điều khiển</Link>
          <FaChevronRight size={10} style={{ margin: '0 10px', color: '#94a3b8' }} /> 
          <span>Lớp {courseInfo?.classCode || '...'}</span> 
          <FaChevronRight size={10} style={{ margin: '0 10px', color: '#94a3b8' }} />
          <div className="act-breadcrumb-active">Quản lý lớp học</div>
        </div>
        <h1 className="cd-title">{courseInfo?.subjectName || 'Lớp học'}</h1> 
      </div>

      <div className="cd-main">
        <div className="cd-tabs-menu">
          <button onClick={() => setActiveTab('khoahoc')} className={`cd-tab-btn ${activeTab === 'khoahoc' ? 'active' : ''}`}>
            <FaBookOpen /> Nội dung bài học
          </button>
          
          <button onClick={() => setActiveTab('thanhvien')} className={`cd-tab-btn ${activeTab === 'thanhvien' ? 'active' : ''}`}>
            <FaUsers /> Danh sách lớp
          </button>

         

          <button onClick={() => setActiveTab('diemso')} className={`cd-tab-btn ${activeTab === 'diemso' ? 'active' : ''}`}>
            <FaChartBar /> Bảng điểm chung
          </button>

          {/* TAB MỚI: NGÂN HÀNG CÂU HỎI */}
          <button onClick={() => setActiveTab('nganhang')} className={`cd-tab-btn ${activeTab === 'nganhang' ? 'active' : ''}`}>
            <FaDatabase /> Ngân hàng câu hỏi
          </button>

          <button onClick={() => setActiveTab('caidat')} className={`cd-tab-btn ${activeTab === 'caidat' ? 'active' : ''}`}>
            <FaCog /> Cài đặt lớp
          </button>
        </div>

        {/* TAB 1: KHÓA HỌC */}
        {activeTab === 'khoahoc' && (
          <div className="tab-content-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <button onClick={() => setIsAddingSection(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                <FaPlusCircle /> Thêm chủ đề mới
              </button>
              <button onClick={collapseAll} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Thu gọn toàn bộ</button>
            </div>

            {isAddingSection && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                <input type="text" placeholder="Nhập tên chương/chủ đề..." value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} autoFocus />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleAddSection} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu chủ đề</button>
                  <button onClick={() => setIsAddingSection(false)} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #94a3b8', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '10px' }}>Chưa có nội dung.</div>
            ) : sections.map(section => (
              <div key={section.id} className="cd-section-card">
                
                <div className={`cd-section-header ${section.isOpen ? 'open' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }} onClick={() => toggleSection(section.id)}>
                    <div style={{ color: '#64748b' }}>{section.isOpen ? <FaChevronUp /> : <FaChevronDown />}</div>
                    
                    {editSectionId === section.id ? (
                      <input 
                        type="text" 
                        value={editSectionTitle}
                        onChange={(e) => setEditSectionTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()} 
                        onBlur={handleUpdateSection}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateSection(); }}
                        autoFocus
                        style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', flex: 1 }}
                      />
                    ) : (
                      <h3 className="cd-section-title">{section.title}</h3>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', color: '#94a3b8' }}>
                    {editSectionId !== section.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditSectionId(section.id); setEditSectionTitle(section.title); }} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} title="Sửa tên chủ đề"
                      >
                        <FaEdit size={16} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); confirmDeleteSection(section.id, section.title); }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Xóa chủ đề"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>

                {section.isOpen && (
                  <div className="cd-section-body">
                    {section.activities?.map((activity: any) => {
                      const display = getActivityDisplayProps(activity.type);
                      return (
                        <div key={activity.id} className="cd-item-row" onClick={() => navigate(`/teacher/activity/${activity.id}`)}>
                          <div className="cd-item-icon" style={{ backgroundColor: display.color }}>{display.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div className="cd-item-type">{display.typeName}</div>
                            <div className={`cd-item-title ${display.isAIExam ? 'ai-exam' : ''}`}>{activity.title}</div>
                          </div>
                        </div>
                      );
                    })}
                    <button style={{ marginTop: '15px', background: '#f8fafc', border: '1px dashed #94a3b8', padding: '12px', borderRadius: '6px', color: '#3b82f6', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%' }} onClick={() => openActivityModal(section.id)}>
                      <FaPlusCircle /> Thêm Tài liệu / Bài tập
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

       
        {/* TAB MỚI: NGÂN HÀNG CÂU HỎI (GRID CARDS) */}
        {/* ========================================================== */}
        {activeTab === 'nganhang' && (
          <div className="tab-content-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: '0 0 5px 0' }}>Kho câu hỏi của lớp</h2>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Tạo và lưu trữ các bộ câu hỏi để sử dụng cho các bài thi Trắc nghiệm/Tự luận.</p>
              </div>
              <button 
                onClick={() => setIsBankModalOpen(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}
              >
                <FaPlusCircle /> Tạo Ngân hàng mới
              </button>
            </div>

            {loadingBanks ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách ngân hàng...</div>
            ) : questionBanks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <FaDatabase size={48} color="#e2e8f0" style={{ marginBottom: '15px' }} />
                <p style={{ color: '#64748b', fontWeight: '500', fontSize: '16px', margin: '0 0 15px 0' }}>Lớp học này chưa có Ngân hàng câu hỏi nào.</p>
                <button onClick={() => setIsBankModalOpen(true)} style={{ background: 'none', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Tạo ngân hàng đầu tiên
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {questionBanks.map((bank) => (
                  <div key={bank.id} style={{ 
                    backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', 
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'; }}
                  onClick={() => navigate(`/teacher/class/${classId}/bank/${bank.id}`)}
                  >
                    {/* Header Card */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ede9fe', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaDatabase size={18} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {bank.name}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Nút 3 chấm cho Action */}
                      <div style={{ position: 'relative' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === bank.id ? null : bank.id); }}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '5px' }}
                        >
                          <FaEllipsisV />
                        </button>
                        
                        {activeDropdownId === bank.id && (
                          <div style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10, width: '150px', overflow: 'hidden' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveDropdownId(null); confirmDeleteBank(bank.id, bank.name); }}
                              style={{ width: '100%', textAlign: 'left', padding: '10px 15px', background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <FaTrash /> Xóa ngân hàng
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Body Card */}
                    <div style={{ padding: '15px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Tổng số câu hỏi:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '2px 10px', borderRadius: '12px' }}>
                          {bank.questionCount}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                        <span>Tạo ngày: {new Date(bank.createdAt).toLocaleDateString('vi-VN')}</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Chi tiết <FaChevronRight size={10} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THÀNH VIÊN */}
        {activeTab === 'thanhvien' && (
          <div className="tab-content-fade cd-approval-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>Danh sách sinh viên chính thức ({filteredMembers.length})</h2>
              <div style={{ position: 'relative', width: '250px' }}>
                <FaSearch style={{ position: 'absolute', top: '10px', left: '12px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Tìm sinh viên..." 
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 35px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>
            
            {loadingMembers ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách...</div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <FaUserGraduate size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                <p style={{ color: '#94a3b8' }}>Không tìm thấy sinh viên nào.</p>
              </div>
            ) : (
              <>
                <div className="cd-approval-table-container">
                  <table className="cd-approval-table">
                    <thead>
                      <tr>
                        <th>Họ và Tên</th>
                        <th>Email</th>
                        <th>Ngày gia nhập</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMembers.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                                <img src={member.avatarUrl ? `${BACKEND_URL}${member.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=random`} alt="avt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <span style={{ fontWeight: 'bold' }}>{member.fullName}</span>
                            </div>
                          </td>
                          <td style={{ color: '#64748b' }}>{member.email}</td>
                          <td style={{ color: '#64748b' }}>{new Date().toLocaleDateString('vi-VN')}</td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button 
                                onClick={() => confirmRemoveStudent(member.id, member.fullName)}
                                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                              >
                                <FaTrash size={12} /> Xóa khỏi lớp
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalMemberPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    ><FaChevronLeft size={12} /></button>

                    {[...Array(totalMemberPages)].map((_, i) => (
                      <button
                        key={i} onClick={() => setCurrentPage(i + 1)}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', border: '1px solid',
                          borderColor: currentPage === i + 1 ? '#2563eb' : '#e2e8f0',
                          backgroundColor: currentPage === i + 1 ? '#2563eb' : 'white',
                          color: currentPage === i + 1 ? 'white' : '#1e293b', fontWeight: 'bold', cursor: 'pointer'
                        }}
                      >{i + 1}</button>
                    ))}

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalMemberPages))} disabled={currentPage === totalMemberPages}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: currentPage === totalMemberPages ? 'not-allowed' : 'pointer' }}
                    ><FaChevronRight size={12} /></button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

       
        {/* TAB 4: BẢNG ĐIỂM CHUNG */}
        {activeTab === 'diemso' && (
          <div className="tab-content-fade cd-approval-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}>Bảng điểm tổng hợp ({filteredGrades.length} SV)</h2>
                <div style={{ position: 'relative', width: '250px' }}>
                  <FaSearch style={{ position: 'absolute', top: '10px', left: '12px', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Tìm sinh viên..." 
                    value={gradeSearchQuery}
                    onChange={(e) => setGradeSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 35px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              </div>
              <button onClick={exportToCSV} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 15px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaDownload /> Xuất Excel (CSV)
              </button>
            </div>
            
             <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
                                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FaInfoCircle /> Hướng dẫn tính điểm:</strong>
                                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                    <li><strong>Điểm hệ 10</strong> = (Trung bình Bài tập × 30%) + (Trung bình Bài thi × 70%). <em>(Lưu ý: Hệ thống chỉ tính trên các bài bạn đã có điểm)</em></li>
                                    <li><strong>Thang điểm chữ:</strong> A (Giỏi: 8.5 - 10), B (Khá: 7.0 - 8.4), C (Trung bình: 5.5 - 6.9), D (Yếu: 4.0 - 5.4), F (Trượt: Dưới 4.0).</li>
                                  </ul>
                                </div>

            {loadingGrades ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tổng hợp điểm số...</div>
            ) : filteredGrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <FaChartBar size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                <p style={{ color: '#94a3b8' }}>Không tìm thấy sinh viên nào.</p>
              </div>
            ) : (
              <>
                <div className="cd-approval-table-container" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  <table className="cd-approval-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '150px', position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>Sinh viên</th>
                        <th style={{ minWidth: '180px' }}>Email</th>
                        
                       {gradesData.activities?.map((activity: any) => (
                          <th key={activity.id} style={{ minWidth: '120px', textAlign: 'center' }}>
                            <div 
                              onClick={() => navigate(`/teacher/activity/${activity.id}`)}
                              style={{ 
                                cursor: 'pointer', 
                                color: '#2563eb', 
                                transition: 'color 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#1e3a8a'} 
                              onMouseLeave={(e) => e.currentTarget.style.color = '#2563eb'}
                              title="Nhấn để chấm điểm / xem chi tiết hoạt động"
                            >
                              {activity.title}
                            </div>
                            
                            <div style={{ fontSize: '11px', color: activity.type === 'EXAM' ? '#ef4444' : '#3b82f6', marginTop: '4px' }}>
                              Trọng số: {activity.weight}%
                            </div>
                          </th>
                        ))}
                        
                        <th style={{ minWidth: '120px', textAlign: 'center', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>Điểm tổng kết</th>
                        <th style={{ minWidth: '100px', textAlign: 'center', backgroundColor: '#eff6ff', color: '#1e3a8a' }}>Xếp loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGrades.map((student: any) => {
                        const fScore = student.finalScore;
                        const hasFScore = fScore !== undefined && fScore !== null && !isNaN(Number(fScore));

                        return (
                          <tr key={student.studentId}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1, fontWeight: 'bold' }}>{student.fullName}</td>
                            <td style={{ color: '#64748b' }}>{student.email}</td>
                            
                            {gradesData.activities?.map((activity: any) => {
                              const score = student.scores?.[activity.id];
                              const hasScore = score !== undefined && score !== null && !isNaN(Number(score));
                              const color = !hasScore ? '#94a3b8' : (Number(score) >= 5 ? '#16a34a' : '#ef4444');
                              
                              return (
                                <td key={activity.id} style={{ textAlign: 'center', fontWeight: 'bold', color: color }}>
                                  {hasScore ? Number(score).toFixed(1) : '--'}
                                </td>
                              );
                            })}
                            
                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: hasFScore ? (Number(fScore) >= 5 ? '#2563eb' : '#ef4444') : '#94a3b8' }}>
                              {hasFScore ? Number(fScore).toFixed(1) : '--'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ 
                                padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', 
                                backgroundColor: student.letterGrade === 'F' ? '#fee2e2' : '#f1f5f9',
                                color: student.letterGrade === 'F' ? '#ef4444' : '#ca8a04' 
                              }}>
                                {student.letterGrade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalGradePages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setGradePage(prev => Math.max(prev - 1, 1))} disabled={gradePage === 1}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: gradePage === 1 ? 'not-allowed' : 'pointer' }}
                    ><FaChevronLeft size={12} /></button>

                    {[...Array(totalGradePages)].map((_, i) => (
                      <button
                        key={i} onClick={() => setGradePage(i + 1)}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', border: '1px solid',
                          borderColor: gradePage === i + 1 ? '#2563eb' : '#e2e8f0',
                          backgroundColor: gradePage === i + 1 ? '#2563eb' : 'white',
                          color: gradePage === i + 1 ? 'white' : '#1e293b', fontWeight: 'bold', cursor: 'pointer'
                        }}
                      >{i + 1}</button>
                    ))}

                    <button 
                      onClick={() => setGradePage(prev => Math.min(prev + 1, totalGradePages))} disabled={gradePage === totalGradePages}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: gradePage === totalGradePages ? 'not-allowed' : 'pointer' }}
                    ><FaChevronRight size={12} /></button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 5: CÀI ĐẶT */}
        {activeTab === 'caidat' && (
          <div className="tab-content-fade cd-settings-view" style={{ padding: '30px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '25px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <FaCog color="#64748b" /> Quản lý thông tin lớp học
            </h2>
            
            <form onSubmit={handleUpdateSettings}>
              
              {/* KHU VỰC THAY ĐỔI ẢNH BÌA */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Ảnh bìa khóa học</label>
                <div style={{ 
                  position: 'relative', width: '100%', height: '200px', backgroundColor: '#f8fafc', 
                  borderRadius: '12px', border: '2px dashed #cbd5e1', overflow: 'hidden',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                  backgroundImage: coverImagePreview ? `url(${coverImagePreview})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center'
                }}
                  onClick={() => document.getElementById('coverImageInput')?.click()}
                >
                  <div style={{ 
                    position: 'absolute', inset: 0, backgroundColor: coverImagePreview ? 'rgba(0,0,0,0.4)' : 'transparent',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    color: coverImagePreview ? 'white' : '#64748b', transition: 'background 0.2s'
                  }} className="upload-overlay">
                    <FaFileUpload size={30} style={{ marginBottom: '10px' }} />
                    <span style={{ fontWeight: '500' }}>{coverImagePreview ? 'Nhấn để thay đổi ảnh' : 'Nhấn để tải lên ảnh bìa mới'}</span>
                    <span style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>(JPG, PNG. Tối đa 5MB)</span>
                  </div>
                  <input 
                    id="coverImageInput" 
                    type="file" 
                    accept="image/jpeg, image/png" 
                    style={{ display: 'none' }} 
                    onChange={handleCoverImageChange}
                  />
                </div>
              </div>

              {/* THÔNG TIN MÃ LỚP VÀ GIẢNG VIÊN (READONLY) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Mã lớp</label>
                  <input 
                    type="text" 
                    value={courseInfo?.classCode || ''} 
                    disabled
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 'bold' }}
                  />
                </div>

                {/* THÊM MỚI: KHU VỰC GIẢNG VIÊN */}
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Giảng viên phụ trách</label>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', 
                    borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' 
                  }}>
                    <img 
                      src={courseInfo?.teacherAvatar ? (courseInfo.teacherAvatar.startsWith('http') ? courseInfo.teacherAvatar : `${BACKEND_URL}${courseInfo.teacherAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(courseInfo?.teacherName || 'G V')}&background=random&color=fff`} 
                      alt="Teacher" 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>{courseInfo?.teacherName || 'Chưa cập nhật'}</span>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>{courseInfo?.teacherEmail || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SỬA ĐỔI: TRẠNG THÁI GIÁ TIỀN VÀ SĨ SỐ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                    Giá khóa học (VNĐ)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="Nhập 0 nếu miễn phí" 
                      value={settingsForm.price !== undefined ? settingsForm.price : (courseInfo?.price || 0)}
                      onChange={(e) => setSettingsForm({...settingsForm, price: parseFloat(e.target.value) || 0})}
                      style={{ width: '100%', padding: '12px 40px 12px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                    />
                    <span style={{position: 'absolute', right: '15px', top: '12px', color: '#64748b', fontWeight: 'bold'}}>₫</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                    * Đặt 0 để miễn phí.
                  </div>
                </div>

               <div>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                    Giới hạn sĩ số
                  </label>
                  <input 
                    type="number" 
                    min={courseInfo?.currentStudents || 1} 
                    max="500"
                    value={settingsForm.maxStudents}
                    onChange={(e) => setSettingsForm({...settingsForm, maxStudents: Number(e.target.value)})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                  
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaUsers size={12} />
                    Sĩ số hiện tại: <strong style={{ color: '#2563eb' }}>{courseInfo?.currentStudents || 0}</strong> sinh viên
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button 
                  type="submit"
                  disabled={isUpdatingSettings}
                  style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 25px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: isUpdatingSettings ? 'not-allowed' : 'pointer', opacity: isUpdatingSettings ? 0.7 : 1 }}
                >
                  {isUpdatingSettings ? 'Đang lưu thay đổi...' : 'Lưu cài đặt'}
                </button>
              </div>

            </form>

            {/* KHU VỰC NGUY HIỂM (XÓA LỚP) */}
            <div style={{ marginTop: '40px', padding: '20px', borderRadius: '10px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2' }}>
              <h3 style={{ color: '#dc2626', margin: '0 0 10px 0', fontSize: '16px' }}>Khu vực nguy hiểm</h3>
              <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '15px' }}>
                Một khi bạn kết thúc và lưu trữ lớp học, trạng thái lớp sẽ chuyển sang <strong>Hoàn thành</strong>. Lớp học vẫn tồn tại nhưng sinh viên sẽ không thể tương tác hay nộp bài mới.
              </p>
              
              {courseInfo?.status === 'COMPLETED' ? (
                <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontWeight: 'bold', display: 'inline-block' }}>
                  Lớp học này đã kết thúc!
                </div>
              ) : (
                <button 
                  onClick={confirmCompleteClass} 
                  style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}
                >
                  <FaTrash /> Kết thúc & Lưu trữ lớp học
                </button>
              )}
            </div>

          </div>
        )}
      </div>

     {/* MODAL TẠO HOẠT ĐỘNG */}
      {isActivityModalOpen && (
        <div className="td-modal-overlay">
          <div className="td-modal-content" style={{ maxWidth: '600px' }}>
            <div className="td-modal-header">
              <h2>Thêm hoạt động mới</h2>
              <button className="td-modal-close" onClick={() => setIsActivityModalOpen(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleCreateActivity} className="td-modal-body">
              <div className="td-form-group">
                <label>Loại hoạt động <span style={{color: 'red'}}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  {[
                    { type: 'FILE', label: 'Tài liệu (File)', icon: <FaFileAlt /> }, 
                    { type: 'URL', label: 'Liên kết (URL)', icon: <FaGlobe /> }, 
                    { type: 'ASSIGNMENT', label: 'Bài tập tự luận', icon: <FaFileUpload /> }, 
                    // ĐÃ SỬA TYPE VÀ LABEL Ở DÒNG BÊN DƯỚI
                    { type: 'EXAM', label: 'Kỳ thi', icon: <FaCheckSquare /> }
                  ].map((item) => (
                    <div 
                      key={item.type} 
                      onClick={() => setActivityForm({...activityForm, type: item.type})} 
                      style={{ 
                        padding: '12px', 
                        border: `2px solid ${activityForm.type === item.type ? '#3b82f6' : '#e2e8f0'}`, 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        backgroundColor: activityForm.type === item.type ? '#eff6ff' : 'white', 
                        fontWeight: activityForm.type === item.type ? 'bold' : 'normal', 
                        color: activityForm.type === item.type ? '#1e3a8a' : '#475569' 
                      }}
                    >
                      {item.icon} {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="td-form-group" style={{ marginTop: '20px' }}>
                <label>Tiêu đề <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Nhập tiêu đề..." 
                  value={activityForm.title} 
                  onChange={(e) => setActivityForm({...activityForm, title: e.target.value})} 
                  required 
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                />
              </div>
              <div className="td-modal-footer">
                <button type="button" className="td-btn-cancel" onClick={() => setIsActivityModalOpen(false)}>Hủy</button>
                <button type="submit" className="td-btn-submit" disabled={isSubmittingActivity}>
                  {isSubmittingActivity ? 'Đang tạo...' : 'Tạo hoạt động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      

    </div>
  );
}