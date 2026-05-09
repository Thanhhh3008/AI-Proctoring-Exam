import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaCheckSquare, FaFileUpload, FaGlobe, FaEdit,
  FaCog, FaPaperclip, FaHome, FaChevronRight, FaFileAlt,
  FaEye, FaEyeSlash, FaLock, FaTrashAlt,
  FaVideo, FaDesktop, FaHourglassHalf, FaClipboardList, FaListOl, FaRandom, FaDatabase, FaExclamationCircle, FaShieldAlt, FaRegClock, FaTimes
} from 'react-icons/fa';
import axiosClient from '../../api/axiosClient';
import '../ActivityDetail/ActivityDetailPage.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function TeacherActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<any>(null);
  const [examData, setExamData] = useState<any>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);

  // Danh sách ngân hàng câu hỏi để GV chọn
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    fileUrl: '',
    dueDate: '',
    isHidden: true,
    isLocked: false,
    lockAfterDueDate: false
  });

  const [examSettings, setExamSettings] = useState({
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    maxQuestions: 10,
    status: 'UPCOMING',
    strictMode: true,
    requireCamera: true
  });

  // STATE: MODAL CẤU HÌNH BỐC ĐỀ TỰ ĐỘNG
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [generationRules, setGenerationRules] = useState({
    bankIds: [] as string[],
    mcq: { easy: 0, medium: 0, hard: 0 },
    essay: { easy: 0, medium: 0, hard: 0 }
  });

  const [appModal, setAppModal] = useState<{
    isOpen: boolean;
    isConfirm: boolean;
    isSuccess: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    isConfirm: false,
    isSuccess: false,
    title: '',
    message: '',
    confirmText: 'Đóng',
    onConfirm: () => { }
  });

  const closeModal = () => setAppModal(prev => ({ ...prev, isOpen: false }));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchActivityAndStats = async () => {
      try {
        if (!id) return;

        const actRes = await axiosClient.get(`/activities/${id}`);
        setActivity(actRes.data);

        setEditData({
          title: actRes.data.title,
          description: actRes.data.description || '',
          fileUrl: actRes.data.fileUrl || '',
          dueDate: actRes.data.dueDate ? new Date(actRes.data.dueDate).toISOString().slice(0, 16) : '',
          isHidden: actRes.data.isHidden || false,
          isLocked: actRes.data.isLocked || false,
          lockAfterDueDate: actRes.data.lockAfterDueDate || false
        });

        if (actRes.data.type === 'ASSIGNMENT') {
          const subRes = await axiosClient.get(`/activities/${id}/submissions`);
          setAllSubmissions(subRes.data);
        }

        if (actRes.data.type === 'EXAM' && actRes.data.examId) {
          const examRes = await axiosClient.get(`/exams/${actRes.data.examId}`);
          setExamData(examRes.data);
          setExamSettings({
            startTime: examRes.data.startTime ? new Date(examRes.data.startTime).toISOString().slice(0, 16) : '',
            endTime: examRes.data.endTime ? new Date(examRes.data.endTime).toISOString().slice(0, 16) : '',
            durationMinutes: examRes.data.durationMinutes || 60,
            maxQuestions: examRes.data.maxQuestions || 10,
            status: examRes.data.status || 'UPCOMING',
            strictMode: examRes.data.strictMode !== false,
            requireCamera: examRes.data.requireCamera !== false
          });

          if (examRes.data.generationRules) {
            setGenerationRules(examRes.data.generationRules);
          }

          if (actRes.data.section?.classId) {
            const bankRes = await axiosClient.get(`/classes/${actRes.data.section.classId}/question-banks`);
            setAvailableBanks(bankRes.data);
          }
        }
      } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivityAndStats();
  }, [id]);

  const extractFileName = (url: string) => {
    if (!url) return "";
    return url.split('/').pop();
  };

  const handleTriggerFileSelect = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setSelectedFile(e.target.files[0]);
  };

  const handleToggleVisibility = async () => {
    try {
      const newIsHidden = !activity.isHidden;
      await axiosClient.put(`/activities/${id}`, {
        ...editData,
        isHidden: newIsHidden
      });
      setActivity({ ...activity, isHidden: newIsHidden });
      setEditData({ ...editData, isHidden: newIsHidden });
    } catch (error: any) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Lỗi', message: 'Lỗi khi đổi trạng thái hiển thị!',
        confirmText: 'Đóng', onConfirm: closeModal
      });
    }
  };

  const handleToggleLock = () => {
    const actionText = activity.isLocked ? "MỞ KHÓA thủ công" : "KHÓA NGAY hoạt động này";

    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false,
      title: 'Xác nhận thao tác',
      message: `Bạn có chắc chắn muốn ${actionText}? Sinh viên sẽ ${activity.isLocked ? 'có thể tiếp tục tham gia' : 'bị chặn quyền tham gia ngay lập tức'}.`,
      confirmText: 'Xác nhận',
      onConfirm: async () => {
        try {
          const newLockState = !activity.isLocked;
          await axiosClient.put(`/activities/${id}`, {
            ...editData,
            isLocked: newLockState
          });
          setActivity({ ...activity, isLocked: newLockState });
          setEditData({ ...editData, isLocked: newLockState });
          closeModal();
        } catch (error: any) {
          setAppModal({
            isOpen: true, isConfirm: false, isSuccess: false,
            title: 'Lỗi', message: 'Lỗi khi đổi trạng thái khóa!',
            confirmText: 'Đóng', onConfirm: closeModal
          });
        }
      }
    });
  };

  // LOGIC THÊM/XÓA NGÂN HÀNG (UI CHIP)
  const handleAddBank = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    if (!generationRules.bankIds.includes(selectedId)) {
      setGenerationRules(prev => ({ ...prev, bankIds: [...prev.bankIds, selectedId] }));
    }
    e.target.value = "";
  };

  const handleRemoveBank = (idToRemove: string) => {
    setGenerationRules(prev => ({ ...prev, bankIds: prev.bankIds.filter(id => id !== idToRemove) }));
  };

  // TÍNH TỔNG CÂU HỎI TRONG CÁC NGÂN HÀNG ĐÃ CHỌN
  const totalAvailableInBanks = generationRules.bankIds.reduce((sum, id) => {
    const bank = availableBanks.find(b => b.id === id);
    const count = bank?.questions?.length || bank?._count?.questions || bank?.questionCount || bank?.totalQuestions || 0;
    return sum + count;
  }, 0);

  const breakdownTotal = generationRules.bankIds.reduce((acc, id) => {
    const bank = availableBanks.find(b => b.id === id);
    if (bank && bank.breakdown) {
      acc.mcq.easy += bank.breakdown.mcq.easy || 0;
      acc.mcq.medium += bank.breakdown.mcq.medium || 0;
      acc.mcq.hard += bank.breakdown.mcq.hard || 0;
      acc.essay.easy += bank.breakdown.essay.easy || 0;
      acc.essay.medium += bank.breakdown.essay.medium || 0;
      acc.essay.hard += bank.breakdown.essay.hard || 0;
    }
    return acc;
  }, {
    mcq: { easy: 0, medium: 0, hard: 0 },
    essay: { easy: 0, medium: 0, hard: 0 }
  });

  // LOGIC LƯU CẤU HÌNH BỐC ĐỀ TỪ MODAL
  const handleSaveRules = async () => {
    const totalRuleQuestions = generationRules.mcq.easy + generationRules.mcq.medium + generationRules.mcq.hard +
      generationRules.essay.easy + generationRules.essay.medium + generationRules.essay.hard;

    if (totalRuleQuestions !== Number(examSettings.maxQuestions)) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Lỗi số lượng phân bổ',
        message: `Bạn đang phân bổ rút ${totalRuleQuestions} câu. Nhưng tổng số câu hỏi của bài thi được quy định là ${examSettings.maxQuestions} câu. Vui lòng cân đối lại!`,
        confirmText: 'Đã hiểu', onConfirm: closeModal
      });
      return;
    }

    if (generationRules.bankIds.length === 0) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn ít nhất 1 nguồn Ngân hàng câu hỏi!',
        confirmText: 'Đã hiểu', onConfirm: closeModal
      });
      return;
    }

    const req = generationRules;
    const av = breakdownTotal;
    let errors: string[] = [];

    if (req.mcq.easy > av.mcq.easy) errors.push(`Trắc nghiệm - Dễ: yêu cầu ${req.mcq.easy}, nhưng chỉ có ${av.mcq.easy}.`);
    if (req.mcq.medium > av.mcq.medium) errors.push(`Trắc nghiệm - TB: yêu cầu ${req.mcq.medium}, nhưng chỉ có ${av.mcq.medium}.`);
    if (req.mcq.hard > av.mcq.hard) errors.push(`Trắc nghiệm - Khó: yêu cầu ${req.mcq.hard}, nhưng chỉ có ${av.mcq.hard}.`);

    if (req.essay.easy > av.essay.easy) errors.push(`Tự luận - Dễ: yêu cầu ${req.essay.easy}, nhưng chỉ có ${av.essay.easy}.`);
    if (req.essay.medium > av.essay.medium) errors.push(`Tự luận - TB: yêu cầu ${req.essay.medium}, nhưng chỉ có ${av.essay.medium}.`);
    if (req.essay.hard > av.essay.hard) errors.push(`Tự luận - Khó: yêu cầu ${req.essay.hard}, nhưng chỉ có ${av.essay.hard}.`);

    if (errors.length > 0) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Lỗi phân bổ câu hỏi',
        message: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((err, idx) => <div key={idx}>• {err}</div>)}
            <div style={{ marginTop: '10px', color: '#dc2626', fontWeight: 'bold' }}>Vui lòng điều chỉnh lại số lượng hoặc chọn thêm Ngân hàng!</div>
          </div>
        ),
        confirmText: 'Đã hiểu', onConfirm: closeModal
      });
      return;
    }

    try {
      await axiosClient.put(`/exams/${activity.examId}`, {
        ...examSettings,
        generationRules: generationRules
      });
      setExamData((prev: any) => ({ ...prev, generationRules }));
      setIsRuleModalOpen(false);
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: true,
        title: 'Thành công', message: 'Đã lưu cấu hình rút đề tự động!',
        confirmText: 'Đóng', onConfirm: closeModal
      });
    } catch (error) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Lỗi',
        message: 'Có lỗi xảy ra khi lưu cấu hình. Vui lòng thử lại!',
        confirmText: 'Đóng', onConfirm: closeModal
      });
    }
  };

  const handleSaveEdit = async () => {
    if (activity.type === 'EXAM') {
      if (examSettings.startTime && examSettings.endTime) {
        const start = new Date(examSettings.startTime).getTime();
        const end = new Date(examSettings.endTime).getTime();
        const durationMs = Number(examSettings.durationMinutes) * 60 * 1000;

        if (end - start < durationMs) {
          setAppModal({
            isOpen: true, isConfirm: false, isSuccess: false,
            title: 'Lỗi cài đặt thời gian',
            message: `Thời gian đóng đề phải sau thời gian mở đề ít nhất ${examSettings.durationMinutes} phút.`,
            confirmText: 'Đã hiểu',
            onConfirm: closeModal
          });
          return;
        }
      }

      if (examData?.generationRules) {
        const rules = examData.generationRules;
        const currentRulesTotal = (rules.mcq?.easy || 0) + (rules.mcq?.medium || 0) + (rules.mcq?.hard || 0) +
          (rules.essay?.easy || 0) + (rules.essay?.medium || 0) + (rules.essay?.hard || 0);

        if (currentRulesTotal > 0 && currentRulesTotal !== Number(examSettings.maxQuestions)) {
          setAppModal({
            isOpen: true, isConfirm: false, isSuccess: false,
            title: 'Xung đột dữ liệu',
            message: `Tổng số câu hỏi mới (${examSettings.maxQuestions}) không khớp với cấu hình rút đề tự động hiện tại (${currentRulesTotal} câu). Vui lòng đặt lại thành ${currentRulesTotal} hoặc cập nhật lại Cấu hình rút đề trước!`,
            confirmText: 'Đóng', onConfirm: closeModal
          });
          return;
        }
      }
    }

    try {
      let finalUrl = editData.fileUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await axiosClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalUrl = uploadRes.data.url;
      }

      await axiosClient.put(`/activities/${id}`, {
        title: editData.title,
        description: editData.description,
        fileUrl: finalUrl,
        dueDate: editData.dueDate ? new Date(editData.dueDate).toISOString() : null,
        isHidden: editData.isHidden,
        isLocked: editData.isLocked,
        lockAfterDueDate: editData.lockAfterDueDate
      });

      if (activity.type === 'EXAM' && activity.examId) {
        await axiosClient.put(`/exams/${activity.examId}`, {
          title: editData.title,
          description: editData.description,
          startTime: examSettings.startTime ? new Date(examSettings.startTime).toISOString() : null,
          endTime: examSettings.endTime ? new Date(examSettings.endTime).toISOString() : null,
          durationMinutes: Number(examSettings.durationMinutes),
          maxQuestions: Number(examSettings.maxQuestions),
          status: examSettings.status,
          strictMode: examSettings.strictMode,
          requireCamera: examSettings.requireCamera
        });
      }

      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: true,
        title: 'Thành công', message: 'Đã cập nhật thay đổi thành công!',
        confirmText: 'Đóng', onConfirm: () => {
          closeModal();
          setIsEditing(false);
          setSelectedFile(null);
        }
      });

      const updatedRes = await axiosClient.get(`/activities/${id}`);
      setActivity(updatedRes.data);

      if (updatedRes.data.type === 'EXAM' && updatedRes.data.examId) {
        const examRes = await axiosClient.get(`/exams/${updatedRes.data.examId}`);
        setExamData(examRes.data);
      }

    } catch (error: any) {
      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: false,
        title: 'Lỗi lưu dữ liệu', message: error.response?.data?.message || 'Lỗi khi lưu thay đổi!',
        confirmText: 'Đóng', onConfirm: closeModal
      });
    }
  };

  const handleDeleteActivity = () => {
    setAppModal({
      isOpen: true,
      isConfirm: true,
      isSuccess: false,
      title: 'Cảnh báo nguy hiểm',
      message: 'Bạn có chắc chắn muốn xóa hoạt động này? TOÀN BỘ dữ liệu bài làm và điểm số của sinh viên sẽ bị XÓA VĨNH VIỄN không thể khôi phục!',
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/activities/${id}`);
          setAppModal({
            isOpen: true,
            isConfirm: false,
            isSuccess: true,
            title: 'Thành công',
            message: 'Đã xóa hoạt động và toàn bộ dữ liệu liên quan thành công!',
            confirmText: 'Quay về lớp học',
            onConfirm: () => {
              closeModal();
              if (activity?.section?.classId) {
                navigate(`/teacher/class/${activity.section.classId}`);
              } else {
                navigate('/teacher-dashboard');
              }
            }
          });

        } catch (error: any) {
          setAppModal({
            isOpen: true,
            isConfirm: false,
            isSuccess: false,
            title: 'Lỗi xóa hoạt động',
            message: error.response?.data?.message || 'Lỗi mạng khi xóa hoạt động. Vui lòng kiểm tra lại!',
            confirmText: 'Đóng',
            onConfirm: closeModal
          });
        }
      }
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
  if (!activity) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Không tìm thấy hoạt động này!</div>;

  const totalStudents = allSubmissions.length;
  const submittedCount = allSubmissions.filter(item => item.submission !== null).length;
  const needGradingCount = allSubmissions.filter(item => item.submission !== null && item.submission.score === null).length;

  const isOverdue = activity.dueDate ? new Date() > new Date(activity.dueDate) : false;

  return (
    <div className="act-container">

      {/* APP MODAL CHUNG */}
      {appModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ maxWidth: '420px', width: '90%', backgroundColor: 'white', borderRadius: '10px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '15px', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: appModal.isSuccess ? '#16a34a' : '#dc2626', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {appModal.isSuccess ? <FaCheckSquare /> : <FaTrashAlt />} {appModal.title}
              </h2>
            </div>
            <div>
              <p style={{ color: '#475569', lineHeight: '1.6', margin: '0 0 25px 0', fontSize: '15px' }}>{appModal.message}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {appModal.isConfirm && (
                  <button onClick={closeModal} style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
                    Hủy bỏ
                  </button>
                )}
                <button
                  onClick={appModal.onConfirm}
                  style={{ backgroundColor: appModal.isSuccess ? '#16a34a' : '#dc2626', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {appModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH RÚT ĐỀ TỰ ĐỘNG */}
      {isRuleModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '700px', maxWidth: '95%', backgroundColor: 'white', borderRadius: '12px', padding: '0', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaRandom color="#3b82f6" /> Cấu hình sinh đề ngẫu nhiên
              </h2>
              <button onClick={() => setIsRuleModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><FaTimes size={20} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px', fontSize: '15px' }}>Chọn nguồn Ngân hàng câu hỏi</label>
                <select
                  onChange={handleAddBank}
                  value=""
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', color: '#0f172a', fontSize: '15px', cursor: 'pointer' }}
                >
                  <option value="" disabled>-- Bấm để chọn ngân hàng --</option>
                  {availableBanks.map(b => (
                    <option key={b.id} value={b.id} disabled={generationRules.bankIds.includes(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                  {generationRules.bankIds.map(id => {
                    const bank = availableBanks.find(b => b.id === id);
                    return bank ? (
                      <div key={id} style={{ backgroundColor: '#334155', color: 'white', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                        <span>{bank.name}</span>
                        <span onClick={() => handleRemoveBank(id)} style={{ cursor: 'pointer', opacity: 0.8 }} title="Xóa"><FaTimes size={12} /></span>
                      </div>
                    ) : null;
                  })}
                </div>

                {generationRules.bankIds.length > 0 && (
                  <div style={{ marginTop: '15px', padding: '10px 15px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px dashed #7dd3fc', color: '#0369a1', fontSize: '14px' }}>
                    Tổng số câu hỏi khả dụng trong <strong>{generationRules.bankIds.length}</strong> ngân hàng đã chọn: <strong style={{ fontSize: '16px', color: '#0284c7' }}>{totalAvailableInBanks}</strong> câu.
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px dashed #bae6fd', paddingBottom: '10px' }}>
                  <strong style={{ color: '#0f172a', fontSize: '15px' }}>Số lượng câu hỏi phân bổ:</strong>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>
                    Tổng đang chọn: <strong style={{ color: (generationRules.mcq.easy + generationRules.mcq.medium + generationRules.mcq.hard + generationRules.essay.easy + generationRules.essay.medium + generationRules.essay.hard) === Number(examSettings.maxQuestions) ? '#16a34a' : '#dc2626', fontSize: '16px' }}>
                      {generationRules.mcq.easy + generationRules.mcq.medium + generationRules.mcq.hard + generationRules.essay.easy + generationRules.essay.medium + generationRules.essay.hard}
                    </strong> / {examSettings.maxQuestions}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#334155', display: 'block', marginBottom: '12px' }}>Trắc nghiệm</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>Mức Dễ:</span>
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>(Có sẵn: {breakdownTotal.mcq.easy})</span>
                        </div>
                        <input type="number" min="0" value={generationRules.mcq.easy} onChange={e => setGenerationRules({ ...generationRules, mcq: { ...generationRules.mcq, easy: Number(e.target.value) } })} style={{ width: '80px', padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>Mức TB:</span>
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>(Có sẵn: {breakdownTotal.mcq.medium})</span>
                        </div>
                        <input type="number" min="0" value={generationRules.mcq.medium} onChange={e => setGenerationRules({ ...generationRules, mcq: { ...generationRules.mcq, medium: Number(e.target.value) } })} style={{ width: '80px', padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>Mức Khó:</span>
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>(Có sẵn: {breakdownTotal.mcq.hard})</span>
                        </div>
                        <input type="number" min="0" value={generationRules.mcq.hard} onChange={e => setGenerationRules({ ...generationRules, mcq: { ...generationRules.mcq, hard: Number(e.target.value) } })} style={{ width: '80px', padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#334155', display: 'block', marginBottom: '12px' }}>Tự luận</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>Mức Dễ:</span>
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>(Có sẵn: {breakdownTotal.essay.easy})</span>
                        </div>
                        <input type="number" min="0" value={generationRules.essay.easy} onChange={e => setGenerationRules({ ...generationRules, essay: { ...generationRules.essay, easy: Number(e.target.value) } })} style={{ width: '80px', padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>Mức TB:</span>
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>(Có sẵn: {breakdownTotal.essay.medium})</span>
                        </div>
                        <input type="number" min="0" value={generationRules.essay.medium} onChange={e => setGenerationRules({ ...generationRules, essay: { ...generationRules.essay, medium: Number(e.target.value) } })} style={{ width: '80px', padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>Mức Khó:</span>
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>(Có sẵn: {breakdownTotal.essay.hard})</span>
                        </div>
                        <input type="number" min="0" value={generationRules.essay.hard} onChange={e => setGenerationRules({ ...generationRules, essay: { ...generationRules.essay, hard: Number(e.target.value) } })} style={{ width: '80px', padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '15px', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button onClick={() => setIsRuleModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={handleSaveRules} style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Lưu cấu hình</button>
            </div>
          </div>
        </div>
      )}

      <div className="act-breadcrumb-wrapper">
        <div className="act-breadcrumb">
          <Link to="/teacher-dashboard" className="cd-breadcrumb-link" style={{ color: '#2563eb', fontWeight: 600 }}>
            <FaHome style={{ marginRight: '5px' }} /> Bảng điều khiển
          </Link>
          <FaChevronRight size={10} style={{ margin: '0 10px', color: '#94a3b8' }} />
          <span className="act-breadcrumb-item" onClick={() => navigate(-1)} style={{ cursor: 'pointer', color: '#6b7280' }}>
            Lớp {activity.section?.class?.classCode || 'Khóa học'}
          </span>
          <FaChevronRight size={10} style={{ margin: '0 10px', color: '#94a3b8' }} />
          <div className="act-breadcrumb-active" style={{ fontWeight: 600, color: '#374151' }}>{activity.title}</div>
        </div>
      </div>

      <div className="act-main-content">

        <div className="act-header-section" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="act-icon-box" style={{ backgroundColor: activity.type === 'EXAM' ? '#e11d48' : activity.type === 'ASSIGNMENT' ? '#ec4899' : activity.type === 'URL' ? '#3b82f6' : '#0ea5e9' }}>
              {activity.type === 'EXAM' ? <FaCheckSquare size={24} /> : activity.type === 'ASSIGNMENT' ? <FaFileUpload size={24} /> : activity.type === 'URL' ? <FaGlobe size={24} /> : <FaFileAlt size={24} />}
            </div>
            <div>
              <div className="act-type-label" style={{ color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>QUẢN LÝ {activity.type}</div>
              <h1 className="act-title-text" style={{ color: '#0f172a', margin: '4px 0 0 0' }}>{activity.title}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="act-btn"
              onClick={handleToggleVisibility}
              style={{ marginBottom: 0, backgroundColor: activity.isHidden ? '#64748b' : '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {activity.isHidden ? <><FaEyeSlash /> Đang ẩn với SV</> : <><FaEye /> Đang hiện với SV</>}
            </button>

            <button className="act-btn" onClick={() => setIsEditing(!isEditing)} style={{ marginBottom: 0, backgroundColor: '#2563eb' }}>
              <FaEdit /> {isEditing ? 'Hủy chỉnh sửa' : 'Cài đặt hoạt động'}
            </button>
          </div>
        </div>

        {isEditing ? (
          <div style={{ marginTop: '30px', padding: '24px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              Thông tin chung
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Tiêu đề hoạt động:</label>
              <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Mô tả / Hướng dẫn (tùy chọn):</label>
              <textarea rows={4} value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }} placeholder="Nhập hướng dẫn cho sinh viên..." />
            </div>

            {(activity.type === 'FILE' || activity.type === 'ASSIGNMENT') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>File đính kèm (Đề bài/Tài liệu):</label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button onClick={handleTriggerFileSelect} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Chọn File Mới</button>
                  <span style={{ color: selectedFile ? '#16a34a' : '#64748b', fontSize: '14px' }}>
                    {selectedFile ? selectedFile.name : (editData.fileUrl ? `File hiện tại: ${extractFileName(editData.fileUrl)}` : 'Chưa có file')}
                  </span>
                </div>
              </div>
            )}

            {activity.type === 'URL' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Liên kết URL:</label>
                <input type="text" value={editData.fileUrl} onChange={e => setEditData({ ...editData, fileUrl: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="https://..." />
              </div>
            )}

            {activity.type === 'ASSIGNMENT' && (
              <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '16px' }}>
                  <FaRegClock /> Thiết lập thời gian & quyền nộp bài
                </h4>

                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#475569' }}>Hạn chót nộp bài (Để trống nếu không giới hạn):</label>
                  <input type="datetime-local" value={editData.dueDate} onChange={e => setEditData({ ...editData, dueDate: e.target.value })} style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '250px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editData.lockAfterDueDate} onChange={e => setEditData({ ...editData, lockAfterDueDate: e.target.checked })} style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>Tự động khóa nộp bài sau khi hết hạn</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Hệ thống sẽ chặn sinh viên nộp bài hoặc chỉnh sửa bài làm nếu thời gian hiện tại vượt qua Hạn chót.</span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editData.isLocked} onChange={e => setEditData({ ...editData, isLocked: e.target.checked })} style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#dc2626' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>Khóa hoạt động này ngay lập tức <FaShieldAlt color="#dc2626" /></span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Sinh viên sẽ bị chặn nộp bài ngay bây giờ, bất kể thời gian hạn chót là khi nào. Tính năng này được ưu tiên cao nhất.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* CÀI ĐẶT GIAO DIỆN MỚI CHO EXAM */}
            {activity.type === 'EXAM' && (
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCog color="#64748b" /> Cấu hình Kỳ thi (Proctoring Settings)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Thời gian mở đề:</label>
                    <input type="datetime-local" value={examSettings.startTime} onChange={e => setExamSettings({ ...examSettings, startTime: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Thời gian đóng đề:</label>
                    <input type="datetime-local" value={examSettings.endTime} onChange={e => setExamSettings({ ...examSettings, endTime: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>

                  {/* Ô NHẬP THỜI LƯỢNG VÀ SỐ CÂU HỎI */}
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Thời lượng (Phút):</label>
                    <input type="number" min="1" value={examSettings.durationMinutes} onChange={e => setExamSettings({ ...examSettings, durationMinutes: Number(e.target.value) })} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Tổng số câu hỏi / đề thi:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="number"
                        min="1"
                        value={examSettings.maxQuestions}
                        onChange={e => setExamSettings({ ...examSettings, maxQuestions: Number(e.target.value) })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* SELECT STATUS MỚI CHO EXAM */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Điều khiển trạng thái:</label>
                  <select
                    value={examSettings.status}
                    onChange={e => setExamSettings({ ...examSettings, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc' }}
                  >
                    <option value="UPCOMING">Chế độ Tự động (Đóng mở theo giờ cài đặt)</option>
                    <option value="LOCKED">Khóa thủ công (Chặn sinh viên vào thi ngay lập tức)</option>
                    <option value="ENDED">Kết thúc bài thi (Đóng hoàn toàn)</option>
                  </select>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                    * Chọn "Khóa thủ công" để tạm thời chặn truy cập bất cứ lúc nào.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={examSettings.strictMode} onChange={e => setExamSettings({ ...examSettings, strictMode: e.target.checked })} style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#2563eb' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><FaDesktop color="#64748b" /> Chế độ chống gian lận (Strict Mode)</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Yêu cầu trình duyệt toàn màn hình (Full-screen), ghi log khi chuyển tab và vô hiệu hóa chức năng Copy-Paste.</div>
                    </div>
                  </label>

                  <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }}></div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={examSettings.requireCamera} onChange={e => setExamSettings({ ...examSettings, requireCamera: e.target.checked })} style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#2563eb' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><FaVideo color="#64748b" /> Giám sát qua Camera (AI Proctoring)</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Bắt buộc cấp quyền truy cập Webcam. Hệ thống AI sẽ liên tục nhận diện và cảnh báo các hành vi đáng ngờ.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button
                onClick={handleDeleteActivity}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', fontSize: '14px', fontWeight: '600',
                  backgroundColor: 'white', color: '#dc2626',
                  border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <FaTrashAlt /> Xóa hoạt động
              </button>

              <button onClick={handleSaveEdit} style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}>
                Lưu tất cả thay đổi
              </button>
            </div>
          </div>
        ) : (

          /* CHẾ ĐỘ XEM CHI TIẾT (VIEW MODE) */
          <>
            {activity.description && (
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '16px' }}>Hướng dẫn / Mô tả:</h4>
                <p style={{ margin: 0, color: '#475569', lineHeight: '1.6' }}>{activity.description}</p>
              </div>
            )}

            {(activity.type === 'FILE' || activity.type === 'URL') && (
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>Tài liệu môn học</h3>
                {activity.fileUrl ? (
                  <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' }}>
                      <FaPaperclip color="#94a3b8" />
                      <span style={{ fontWeight: 500 }}>{activity.type === 'FILE' ? 'Tên tệp:' : 'Liên kết:'}</span>
                      <span style={{ color: '#2563eb', fontWeight: 500 }}>{activity.type === 'FILE' ? extractFileName(activity.fileUrl) : activity.fileUrl}</span>
                    </div>
                    <a href={activity.type === 'FILE' ? `${BACKEND_URL}${activity.fileUrl}` : activity.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', padding: '10px 20px', backgroundColor: '#0f172a', color: 'white', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {activity.type === 'FILE' ? 'Tải xuống tệp tin' : 'Truy cập liên kết'}
                    </a>
                  </div>
                ) : (
                  <div style={{ color: '#dc2626', fontStyle: 'italic', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fca5a5' }}>* Bạn chưa cung cấp link hoặc file cho tài liệu này. Vui lòng bấm "Cài đặt hoạt động" để bổ sung.</div>
                )}
              </div>
            )}

            {/* GIAO DIỆN VIEW MỚI CHO EXAM */}
            {activity.type === 'EXAM' && (
              <div>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaCog color="#64748b" /> Cấu hình Giám sát Kỳ thi</h3>

                    {(() => {
                      const status = examData?.currentDisplayStatus || examData?.status;
                      let config = { label: 'CHƯA CÀI ĐẶT', color: '#64748b', bg: '#f1f5f9' };
                      if (status === 'LOCKED') config = { label: '🔒 ĐÃ KHÓA (THỦ CÔNG)', color: '#dc2626', bg: '#fef2f2' };
                      else if (status === 'UPCOMING') config = { label: '⏳ CHƯA BẮT ĐẦU', color: '#854d0e', bg: '#fef9c3' };
                      else if (status === 'ONGOING') config = { label: '🟢 ĐANG DIỄN RA', color: '#166534', bg: '#dcfce7' };
                      else if (status === 'ENDED') config = { label: '🔴 ĐÃ KẾT THÚC', color: '#991b1b', bg: '#fee2e2' };

                      return (
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: config.color, backgroundColor: config.bg, border: `1px solid ${config.color}33` }}>
                          {config.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '24px' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Thời gian mở đề</div>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><FaRegClock color="#94a3b8" /> {examData?.startTime ? new Date(examData.startTime).toLocaleString('vi-VN') : 'Chưa thiết lập'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Thời gian đóng đề</div>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><FaRegClock color="#94a3b8" /> {examData?.endTime ? new Date(examData.endTime).toLocaleString('vi-VN') : 'Chưa thiết lập'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Thời lượng làm bài</div>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><FaHourglassHalf color="#94a3b8" /> {examData?.durationMinutes || 0} phút</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Tổng số câu hỏi</div>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><FaListOl color="#94a3b8" /> {examData?.maxQuestions || 0} câu / Đề</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Hệ thống Bảo mật</div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: examData?.strictMode ? '#dbeafe' : '#f1f5f9', color: examData?.strictMode ? '#1e40af' : '#64748b', fontWeight: '600' }} title="Strict Mode">{examData?.strictMode ? 'Strict: ON' : 'Strict: OFF'}</span>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: examData?.requireCamera ? '#dbeafe' : '#f1f5f9', color: examData?.requireCamera ? '#1e40af' : '#64748b', fontWeight: '600' }} title="Camera Requirement">{examData?.requireCamera ? 'Camera: ON' : 'Camera: OFF'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* HIỂN THỊ TÓM TẮT LUẬT TẠO ĐỀ */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: '0', color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaClipboardList color="#64748b" /> Nội dung bài thi
                    </h3>
                    <button
                      onClick={() => setIsRuleModalOpen(true)}
                      style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
                    >
                      <FaRandom /> Cấu hình ngân hàng đề
                    </button>
                  </div>

                  {examData?.generationRules ? (
                    <div>
                      {/* HIỂN THỊ DANH SÁCH NGÂN HÀNG ĐÃ CHỌN (CHIP/TAG) */}
                      <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                        <div style={{ color: '#475569', fontSize: '14px', marginBottom: '8px' }}>
                          <strong>Nguồn dữ liệu:</strong> Đang bốc ngẫu nhiên từ <strong>{examData.generationRules.bankIds?.length || 0}</strong> ngân hàng câu hỏi:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {examData.generationRules.bankIds?.map((id: string) => {
                            const bank = availableBanks.find(b => b.id === id);
                            return (
                              <span key={id} style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                {bank ? bank.name : 'Ngân hàng không xác định'}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '30px' }}>
                        <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ color: '#334155', display: 'block', marginBottom: '10px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>Cơ cấu Trắc nghiệm:</strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '14px', lineHeight: 1.8 }}>
                            <li>Dễ: <strong style={{ color: '#1e293b' }}>{examData.generationRules.mcq?.easy || 0}</strong> câu</li>
                            <li>Trung bình: <strong style={{ color: '#1e293b' }}>{examData.generationRules.mcq?.medium || 0}</strong> câu</li>
                            <li>Khó: <strong style={{ color: '#1e293b' }}>{examData.generationRules.mcq?.hard || 0}</strong> câu</li>
                          </ul>
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ color: '#334155', display: 'block', marginBottom: '10px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>Cơ cấu Tự luận:</strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '14px', lineHeight: 1.8 }}>
                            <li>Dễ: <strong style={{ color: '#1e293b' }}>{examData.generationRules.essay?.easy || 0}</strong> câu</li>
                            <li>Trung bình: <strong style={{ color: '#1e293b' }}>{examData.generationRules.essay?.medium || 0}</strong> câu</li>
                            <li>Khó: <strong style={{ color: '#1e293b' }}>{examData.generationRules.essay?.hard || 0}</strong> câu</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '15px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaExclamationCircle /> Chưa cấu hình luật rút đề. Hãy bấm nút "Cấu hình" ở trên để thiết lập nguồn đề thi trước khi học sinh bắt đầu.
                    </div>
                  )}
                </div>

                {/* SECTION: MANAGEMENT HUB */}
                <div style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '4px', height: '20px', backgroundColor: '#6366f1', borderRadius: '2px' }}></div>
                    Quản lý bài thi
                  </h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {/* CARD: CHẤM BÀI */}
                    <div className="management-card" style={{
                      backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                      padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px',
                      transition: 'all 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Chấm bài & Kết quả</h4>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Quản lý điểm số và nhận xét</span>
                        </div>
                      </div>
                      <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5', margin: '4px 0' }}>
                        Xem danh sách bài nộp, chấm điểm các câu tự luận và theo dõi tiến độ hoàn thành của sinh viên.
                      </p>
                      <button
                        style={{
                          marginTop: 'auto', padding: '10px 16px', backgroundColor: '#0f172a', color: 'white',
                          border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                        onClick={() => navigate(`/teacher/exam/${activity.examId}/grading`)}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
                      >
                        Vào trang chấm bài <FaChevronRight size={12} />
                      </button>
                    </div>

                    {/* CARD: GIÁM SÁT AI */}
                    {(examData?.strictMode || examData?.requireCamera) && (
                      <div className="management-card" style={{
                        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #fee2e2',
                        padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px',
                        transition: 'all 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                          <div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>Giám sát vi phạm AI</h4>
                            <span style={{ fontSize: '12px', color: '#b91c1c' }}>Hệ thống Proctoring thông minh</span>
                          </div>
                        </div>
                        <p style={{ color: '#7f1d1d', fontSize: '14px', lineHeight: '1.5', margin: '4px 0' }}>
                          Theo dõi thời gian thực, xem bằng chứng hình ảnh và thống kê vi phạm chi tiết của từng sinh viên.
                        </p>
                        <button
                          style={{
                            marginTop: 'auto', padding: '10px 16px', backgroundColor: '#dc2626', color: 'white',
                            border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}
                          onClick={() => navigate(`/teacher/exam/${activity.examId}/proctoring`)}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                        >
                          Mở trang giám sát <FaChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {activity.type === 'ASSIGNMENT' && (
              <>
                <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activity.fileUrl ? '15px' : '0' }}>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>Hạn nộp:</span>
                    <span style={{ color: '#475569' }}>{activity.dueDate ? new Date(activity.dueDate).toLocaleString('vi-VN') : 'Không giới hạn thời gian'}</span>

                    {activity.isLocked && (
                      <span style={{ marginLeft: 'auto', padding: '4px 10px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fca5a5' }}>
                        <FaLock size={10} /> Khóa thủ công
                      </span>
                    )}
                    {!activity.isLocked && activity.lockAfterDueDate && isOverdue && (
                      <span style={{ marginLeft: 'auto', padding: '4px 10px', backgroundColor: '#fef9c3', color: '#ca8a04', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fde047' }}>
                        <FaLock size={10} /> Đã quá hạn
                      </span>
                    )}
                  </div>

                  {activity.fileUrl && (
                    <div style={{ paddingTop: '15px', borderTop: '1px dashed #e2e8f0' }}>
                      <a href={`${BACKEND_URL}${activity.fileUrl}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <FaFileAlt /> Đề bài đính kèm ({extractFileName(activity.fileUrl)})
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px' }}>Tình trạng nộp bài</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '24px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 0', color: '#475569', fontWeight: '500', width: '40%' }}>Trạng thái thu bài:</th>
                        <td style={{ padding: '12px 0' }}>
                          {(() => {
                            if (activity.isLocked) return <span style={{ color: '#dc2626', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FaLock size={12} />Đã khóa (Bởi Giảng viên)</span>;
                            if (activity.lockAfterDueDate && isOverdue) return <span style={{ color: '#dc2626', fontWeight: '600' }}>Đã kết thúc (Không nhận bài trễ)</span>;
                            if (!activity.lockAfterDueDate && isOverdue) return <span style={{ color: '#ca8a04', fontWeight: '600' }}>Quá hạn nộp (Vẫn nhận bài trễ)</span>;
                            return <span style={{ color: '#16a34a', fontWeight: '600' }}>Đang nhận bài</span>;
                          })()}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 0', color: '#475569', fontWeight: '500' }}>Số lượng nộp bài:</th>
                        <td style={{ padding: '12px 0' }}><strong style={{ color: '#16a34a', fontSize: '16px' }}>{submittedCount}</strong> <span style={{ color: '#64748b' }}>/ {totalStudents} sinh viên</span></td>
                      </tr>
                      <tr>
                        <th style={{ padding: '12px 0', color: '#475569', fontWeight: '500' }}>Bài cần chấm:</th>
                        <td style={{ padding: '12px 0' }}><strong style={{ color: '#ea580c', fontSize: '16px' }}>{needGradingCount}</strong> <span style={{ color: '#64748b' }}>bài</span></td>
                      </tr>
                    </tbody>
                  </table>

                  <button
                    style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onClick={() => navigate(`/teacher/activity/${id}/grading`)}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
                  >
                    Vào danh sách chấm bài & nhận xét
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

    </div>

  );
}