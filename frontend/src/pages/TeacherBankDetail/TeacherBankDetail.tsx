import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaChevronRight, FaDatabase, FaPlus, 
  FaFileImport, FaRegEdit, FaRegTrashAlt, 
  FaTimes, FaCheck, FaListUl, FaRegCheckCircle, FaSearch,FaChevronDown,
  FaChevronLeft, FaCloudDownloadAlt, FaBroom
} from 'react-icons/fa';
import './TeacherBankDetail.css'; 
import axiosClient from '../../api/axiosClient';

export default function TeacherBankDetail() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { classId, bankId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Bulk Delete state
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  // Modal Tạo/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // App Modal (Thông báo & Confirm chung)
  const [appModal, setAppModal] = useState({
    isOpen: false, isConfirm: false, isSuccess: false,
    title: '', message: '', confirmText: 'Đóng', onConfirm: () => {}
  });
  const closeAppModal = () => setAppModal(prev => ({ ...prev, isOpen: false }));

  // Form Data
  const [formData, setFormData] = useState({
    questionType: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM', content: '',
    options: [
      { id: 'opt_1', text: '', isCorrect: false }, { id: 'opt_2', text: '', isCorrect: false }
    ]
  });

  // ==============================================================
  // STATE MỚI: IMPORT TỪ NGÂN HÀNG KHÁC (BANK TO BANK)
  // ==============================================================
  const [isBankImportModalOpen, setIsBankImportModalOpen] = useState(false);
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);
  const [selectedSourceBankIds, setSelectedSourceBankIds] = useState<string[]>([]);
  const [sourceQuestionsPool, setSourceQuestionsPool] = useState<any[]>([]);
  
  // Checkbox Filters cho Import
  const [importTypes, setImportTypes] = useState<string[]>(['MULTIPLE_CHOICE', 'ESSAY']);
  const [importDifficulties, setImportDifficulties] = useState<string[]>(['EASY', 'MEDIUM', 'HARD']);
  const [isSubmittingBankImport, setIsSubmittingBankImport] = useState(false);

  // Lấy dữ liệu trang
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const bankRes = await axiosClient.get(`/question-banks/${bankId}`);
        setBankInfo(bankRes.data);
        setQuestions(bankRes.data.questions || []);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Không thể tải dữ liệu Ngân hàng!', confirmText: 'Đóng', onConfirm: closeAppModal });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bankId, classId]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedQuestions([]); 
  }, [searchQuery, filterType, filterDifficulty]);

  // ==============================================================
  // LOGIC IMPORT TỪ NGÂN HÀNG KHÁC (BANK TO BANK)
  // ==============================================================
  
  // Mở Modal và lấy danh sách các ngân hàng khác trong lớp
  const openBankImportModal = async () => {
    setIsBankImportModalOpen(true);
    setSelectedSourceBankIds([]);
    setSourceQuestionsPool([]);
    try {
      const res = await axiosClient.get(`/classes/${classId}/question-banks`);
    
      const otherBanks = res.data.filter((b: any) => b.id !== bankId);
      setAvailableBanks(otherBanks);
    } catch (error) {
      console.error("Lỗi lấy danh sách ngân hàng khác:", error);
    }
  };

  // Thêm Tag Ngân hàng
  const handleAddSourceBank = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id || selectedSourceBankIds.includes(id)) return;
    

    setSelectedSourceBankIds(prev => [...prev, id]);
    e.target.value = ""; // Reset select
  };
  // Xóa Tag Ngân hàng
  const handleRemoveSourceBank = (idToRemove: string) => {
   
    setSelectedSourceBankIds(prev => prev.filter(id => id !== idToRemove));
  };

  useEffect(() => {
    const fetchQuestionsForSelectedBanks = async () => {
      // Nếu không có ngân hàng nào được chọn, làm rỗng pool câu hỏi
      if (selectedSourceBankIds.length === 0) {
        setSourceQuestionsPool([]);
        return;
      }

      try {
        let allQuestions: any[] = [];
        // Lặp qua từng ID đã chọn và lấy câu hỏi của chúng
        for (const sourceId of selectedSourceBankIds) {
          const res = await axiosClient.get(`/question-banks/${sourceId}`);
          if (res.data && res.data.questions) {
            allQuestions = [...allQuestions, ...res.data.questions];
          }
        }
        
        // Cập nhật lại pool câu hỏi một lần duy nhất với dữ liệu chuẩn xác
        setSourceQuestionsPool(allQuestions);
        
      } catch (error) {
        console.error("Lỗi khi tải câu hỏi từ các ngân hàng nguồn:", error);
      }
    };

    fetchQuestionsForSelectedBanks();
    
  }, [selectedSourceBankIds]); // Effect này chạy mỗi khi selectedSourceBankIds thay đổi (thêm/xóa)
  // Helper toggle checkbox array
  const toggleArrayItem = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (arr.includes(val)) setArr(arr.filter(item => item !== val));
    else setArr([...arr, val]);
  };

  // Tính toán số câu hỏi khớp tiêu chí
  const matchedImportQuestions = sourceQuestionsPool.filter(q => 
    importTypes.includes(q.type || q.questionType) && 
    importDifficulties.includes(q.difficulty)
  );
const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setIsImportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Submit Import từ NH khác
  const handleSubmitBankImport = async () => {
    if (matchedImportQuestions.length === 0) return;
    setIsSubmittingBankImport(true);

    try {
      let successCount = 0;
      for (const q of matchedImportQuestions) {
        // Build payload, loại bỏ id cũ
        const payload = {
          type: q.type || q.questionType,
          difficulty: q.difficulty,
          content: q.content,
          options: q.options
        };
        await axiosClient.post(`/question-banks/${bankId}/questions`, payload);
        successCount++;
      }

      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: true,
        title: 'Thành công', message: `Đã import thành công ${successCount} câu hỏi!`,
        confirmText: 'Đóng', onConfirm: closeAppModal
      });
      
      // Reload lại danh sách câu hỏi của ngân hàng hiện tại
      const bankRes = await axiosClient.get(`/question-banks/${bankId}`);
      setQuestions(bankRes.data.questions || []);
      setIsBankImportModalOpen(false);

    } catch (error) {
      setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Lỗi khi import dữ liệu!', confirmText: 'Đóng', onConfirm: closeAppModal });
    } finally {
      setIsSubmittingBankImport(false);
    }
  };

  // ==============================================================
  // CÁC LOGIC KHÁC (GIỮ NGUYÊN)
  // ==============================================================
  const getDifficultyProps = (diff: string) => {
    if (diff === 'EASY') return { class: 'tbd-diff-easy', label: 'Dễ' };
    if (diff === 'HARD') return { class: 'tbd-diff-hard', label: 'Khó' };
    return { class: 'tbd-diff-medium', label: 'Trung bình' }; 
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'ALL' || q.type === filterType;
    const matchDiff = filterDifficulty === 'ALL' || q.difficulty === filterDifficulty;
    return matchSearch && matchType && matchDiff;
  });

  const totalPages = Math.ceil(filteredQuestions.length / PAGE_SIZE);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleToggleSelectRow = (id: string) => {
    if (selectedQuestions.includes(id)) setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    else setSelectedQuestions([...selectedQuestions, id]);
  };

  const handleToggleSelectAll = () => {
    const allIdsOnPage = paginatedQuestions.map(q => q.id);
    const isAllSelected = allIdsOnPage.every(id => selectedQuestions.includes(id));
    if (isAllSelected) setSelectedQuestions(selectedQuestions.filter(id => !allIdsOnPage.includes(id)));
    else setSelectedQuestions([...selectedQuestions, ...allIdsOnPage.filter(id => !selectedQuestions.includes(id))]);
  };

  const handleBulkDelete = () => {
    if (selectedQuestions.length === 0) return;
    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false, title: 'Xóa nhiều câu hỏi', 
      message: `Bạn đang chuẩn bị xóa vĩnh viễn ${selectedQuestions.length} câu hỏi đã chọn. Bạn có chắc chắn muốn tiếp tục?`,
      confirmText: `Xóa ${selectedQuestions.length} câu`,
      onConfirm: async () => {
        try {
          for (const id of selectedQuestions) await axiosClient.delete(`/questions/${id}`);
          setQuestions(questions.filter(q => !selectedQuestions.includes(q.id)));
          setSelectedQuestions([]); 
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: true, title: 'Thành công', message: `Đã xóa ${selectedQuestions.length} câu hỏi.`, confirmText: 'Đóng', onConfirm: closeAppModal });
        } catch (error) {
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Có lỗi xảy ra trong quá trình xóa.', confirmText: 'Đóng', onConfirm: closeAppModal });
        }
      }
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];
        if (rawData.length === 0) return alert("File trống");

        // Kiểm tra cấu trúc file (cột "Nội dung câu hỏi")
        if (rawData.length > 0 && !rawData[0].hasOwnProperty('Nội dung câu hỏi')) {
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi định dạng', message: 'File Excel không đúng cấu trúc (thiếu cột "Nội dung câu hỏi"). Vui lòng sử dụng file mẫu.', confirmText: 'Đóng', onConfirm: closeAppModal });
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = ""; 
          return;
        }

        const formattedQuestions = rawData.map((row: any) => {
          const type = row['Loại câu hỏi'] === 'Trắc nghiệm' ? 'MULTIPLE_CHOICE' : 'ESSAY';
          let difficulty = 'MEDIUM';
          if (row['Độ khó'] === 'Dễ') difficulty = 'EASY';
          if (row['Độ khó'] === 'Khó') difficulty = 'HARD';

          let options = undefined;
          if (type === 'MULTIPLE_CHOICE') {
            const optionsString = row['Các lựa chọn (Trắc nghiệm)'] ? String(row['Các lựa chọn (Trắc nghiệm)']) : '';
            const correctString = row['Đáp án đúng'] ? String(row['Đáp án đúng']).trim() : '';
            options = optionsString.split(' | ').filter(Boolean).map((optRaw, index) => {
              const cleanText = optRaw.replace(/^[A-Z]\.\s*/, '').trim();
              return { id: `opt_import_${Date.now()}_${index}`, text: cleanText, isCorrect: cleanText === correctString };
            });
          }
          return { type, difficulty, content: row['Nội dung câu hỏi'], options };
        });

        let successCount = 0;
        for (const q of formattedQuestions) {
          try { await axiosClient.post(`/question-banks/${bankId}/questions`, q); successCount++; } catch (err) {}
        }
        setAppModal({ isOpen: true, isConfirm: false, isSuccess: true, title: 'Hoàn tất', message: `Import thành công ${successCount} câu.`, confirmText: 'Đóng', onConfirm: closeAppModal });
        const bankRes = await axiosClient.get(`/question-banks/${bankId}`);
        setQuestions(bankRes.data.questions || []);
      } catch (error) {
        setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'File không hợp lệ.', confirmText: 'Đóng', onConfirm: closeAppModal });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleRemoveDuplicates = async () => {
    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false,
      title: 'Dọn dẹp câu hỏi trùng lặp',
      message: 'Hệ thống sẽ quét và giữ lại 1 phiên bản duy nhất cho các câu hỏi có nội dung giống nhau. Hành động này không thể hoàn tác.',
      confirmText: 'Dọn dẹp ngay',
      onConfirm: async () => {
        setAppModal(prev => ({...prev, isOpen: false}));
        setIsImporting(true); // dùng chung state loading
        try {
          const contentMap = new Map<string, string>();
          const idsToDelete: string[] = [];
          
          questions.forEach(q => {
            const normalizedContent = q.content.trim().toLowerCase();
            if (contentMap.has(normalizedContent)) {
              idsToDelete.push(q.id);
            } else {
              contentMap.set(normalizedContent, q.id);
            }
          });

          if (idsToDelete.length === 0) {
            setAppModal({ isOpen: true, isConfirm: false, isSuccess: true, title: 'Hoàn tất', message: 'Không tìm thấy câu hỏi trùng lặp nào trong ngân hàng.', confirmText: 'Đóng', onConfirm: closeAppModal });
            setIsImporting(false);
            return;
          }

          let deletedCount = 0;
          for (const id of idsToDelete) {
            await axiosClient.delete(`/questions/${id}`);
            deletedCount++;
          }

          setAppModal({ isOpen: true, isConfirm: false, isSuccess: true, title: 'Dọn dẹp thành công', message: `Đã dọn dẹp ${deletedCount} câu hỏi trùng lặp.`, confirmText: 'Đóng', onConfirm: closeAppModal });
          
          const bankRes = await axiosClient.get(`/question-banks/${bankId}`);
          setQuestions(bankRes.data.questions || []);
          setSelectedQuestions([]);
        } catch (error) {
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Đã xảy ra lỗi khi dọn dẹp câu hỏi trùng lặp.', confirmText: 'Đóng', onConfirm: closeAppModal });
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  const handleExportExcel = () => {
    if (questions.length === 0) return alert("Không có câu hỏi");
    const excelData = questions.map((q, index) => {
      let optionsText = "", correctAns = "";
      if (q.type === 'MULTIPLE_CHOICE' && q.options) {
        optionsText = q.options.map((opt: any, i: number) => `${String.fromCharCode(65 + i)}. ${opt.text}`).join(' | ');
        correctAns = q.options.find((opt: any) => opt.isCorrect)?.text || "";
      }
      return {
        "STT": index + 1, "Loại câu hỏi": q.type === 'MULTIPLE_CHOICE' ? "Trắc nghiệm" : "Tự luận",
        "Độ khó": q.difficulty === 'EASY' ? "Dễ" : q.difficulty === 'HARD' ? "Khó" : "Trung bình",
        "Nội dung câu hỏi": q.content, "Các lựa chọn (Trắc nghiệm)": optionsText, "Đáp án đúng": q.type === 'MULTIPLE_CHOICE' ? correctAns : "(Tự luận)",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách câu hỏi");
    worksheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 50 }, { wch: 40 }, { wch: 20 }];
    XLSX.writeFile(workbook, `NganHangCauHoi_${bankInfo?.name || 'Export'}.xlsx`);
  };
// Handlers cho Form Câu hỏi
  const handleAddOption = () => setFormData({ ...formData, options: [...formData.options, { id: `opt_${Date.now()}`, text: '', isCorrect: false }] });
  const handleRemoveOption = (optId: string) => {
    if (formData.options.length <= 2) {
      setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Cảnh báo', message: 'Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án.', confirmText: 'Đóng', onConfirm: closeAppModal });
      return;
    }
    setFormData({ ...formData, options: formData.options.filter(opt => opt.id !== optId) });
  };
  const handleChangeOptionText = (optId: string, text: string) => setFormData({ ...formData, options: formData.options.map(opt => opt.id === optId ? { ...opt, text } : opt) });
  const handleSetCorrectOption = (optId: string) => setFormData({ ...formData, options: formData.options.map(opt => ({ ...opt, isCorrect: opt.id === optId })) });

  const openCreateModal = () => {
    setEditingQuestionId(null);
    setFormData({
      questionType: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM', content: '',
      options: [{ id: 'opt_1', text: '', isCorrect: false }, { id: 'opt_2', text: '', isCorrect: false }, { id: 'opt_3', text: '', isCorrect: false }, { id: 'opt_4', text: '', isCorrect: false }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (q: any) => {
    setEditingQuestionId(q.id);
    setFormData({
      questionType: q.type, difficulty: q.difficulty, content: q.content,
      options: q.options ? JSON.parse(JSON.stringify(q.options)) : [
        { id: `opt_${Date.now()}_1`, text: '', isCorrect: false }, 
        { id: `opt_${Date.now()}_2`, text: '', isCorrect: false }
      ]
    });
    setIsModalOpen(true);
  };

  const deleteQuestion = (id: string) => {
    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false, title: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa câu hỏi này?', confirmText: 'Xóa câu hỏi',
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/questions/${id}`);
          setQuestions(questions.filter(q => q.id !== id));
          setSelectedQuestions(selectedQuestions.filter(qId => qId !== id)); 
          closeAppModal();
        } catch (error) { }
      }
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return alert("Vui lòng nhập nội dung.");
    if (formData.questionType === 'MULTIPLE_CHOICE') {
      if (!formData.options.some(opt => opt.isCorrect)) return alert("Chọn 1 đáp án đúng.");
      if (formData.options.some(opt => !opt.text.trim())) return alert("Đáp án không được rỗng.");
    }
    const questionData = { type: formData.questionType, difficulty: formData.difficulty, content: formData.content, options: formData.questionType === 'MULTIPLE_CHOICE' ? formData.options : undefined };
    try {
      if (editingQuestionId) await axiosClient.put(`/questions/${editingQuestionId}`, questionData);
      else await axiosClient.post(`/question-banks/${bankId}/questions`, questionData);
      setIsModalOpen(false);
      const bankRes = await axiosClient.get(`/question-banks/${bankId}`);
      setQuestions(bankRes.data.questions || []);
    } catch (error) { alert("Lỗi khi lưu"); }
  };

  const isAllOnPageSelected = paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.includes(q.id));
  const isSomeOnPageSelected = paginatedQuestions.some(q => selectedQuestions.includes(q.id));

  if (loading) return <div className="tbd-empty-state">Đang tải dữ liệu...</div>;

  return (
    <div className="tbd-container">

      {/* APP MODAL (THÔNG BÁO / CONFIRM) */}
      {appModal.isOpen && (
        <div className="tbd-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="tbd-modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="tbd-modal-header">
              <h2 style={{ margin: 0, color: appModal.isSuccess ? '#16a34a' : (appModal.isConfirm ? '#0f172a' : '#dc2626'), fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {appModal.isSuccess && <FaCheck />} {appModal.title}
              </h2>
            </div>
            <div style={{ padding: '20px 24px', color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>{appModal.message}</div>
            <div className="tbd-modal-footer">
              {appModal.isConfirm && <button className="tbd-btn-secondary" onClick={closeAppModal}>Hủy bỏ</button>}
              <button className="tbd-btn-primary" style={{ backgroundColor: appModal.isSuccess ? '#16a34a' : (appModal.isConfirm ? '#dc2626' : '#2563eb'), borderColor: 'transparent' }} onClick={appModal.onConfirm}>{appModal.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT TỪ NGÂN HÀNG KHÁC */}
      {isBankImportModalOpen && (
        <div className="tbd-modal-overlay" style={{ zIndex: 9998 }}>
          <div className="tbd-modal-content" style={{ width: '600px' }}>
            <div className="tbd-modal-header">
              <h2 className="tbd-modal-title">Nhập từ Ngân hàng khác</h2>
              <button onClick={() => setIsBankImportModalOpen(false)} className="tbd-modal-close"><FaTimes size={20}/></button>
            </div>

            <div className="tbd-form" style={{ paddingBottom: '0' }}>
              
              {/* Chọn Nguồn */}
              <div>
                <label className="tbd-form-label">Chọn nguồn Ngân hàng câu hỏi</label>
                <select className="tbd-form-select" onChange={handleAddSourceBank} value="">
                  <option value="" disabled>-- Bấm để chọn ngân hàng --</option>
                  {availableBanks.map(b => (
                    <option key={b.id} value={b.id} disabled={selectedSourceBankIds.includes(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="tbd-tags-container">
                  {selectedSourceBankIds.map(id => {
                    const bank = availableBanks.find(b => b.id === id);
                    return bank ? (
                      <div key={id} className="tbd-tag">
                        {bank.name}
                        <div className="tbd-tag-close" onClick={() => handleRemoveSourceBank(id)}><FaTimes size={10} /></div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Bộ lọc Type & Difficulty */}
              <div className="tbd-filter-section">
                <h3 style={{ fontSize: '14px', margin: '0 0 15px 0', color: '#1e293b' }}>Bộ lọc câu hỏi</h3>
                <div className="tbd-checkbox-grid">
                  
                  <div className="tbd-checkbox-column">
                    <strong style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Loại câu hỏi</strong>
                    <label className="tbd-checkbox-label">
                      <input type="checkbox" checked={importTypes.includes('MULTIPLE_CHOICE')} onChange={() => toggleArrayItem(importTypes, setImportTypes, 'MULTIPLE_CHOICE')} /> Trắc nghiệm
                    </label>
                    <label className="tbd-checkbox-label">
                      <input type="checkbox" checked={importTypes.includes('ESSAY')} onChange={() => toggleArrayItem(importTypes, setImportTypes, 'ESSAY')} /> Tự luận
                    </label>
                  </div>

                  <div className="tbd-checkbox-column">
                    <strong style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Độ khó</strong>
                    <label className="tbd-checkbox-label">
                      <input type="checkbox" checked={importDifficulties.includes('EASY')} onChange={() => toggleArrayItem(importDifficulties, setImportDifficulties, 'EASY')} /> Dễ
                    </label>
                    <label className="tbd-checkbox-label">
                      <input type="checkbox" checked={importDifficulties.includes('MEDIUM')} onChange={() => toggleArrayItem(importDifficulties, setImportDifficulties, 'MEDIUM')} /> Trung bình
                    </label>
                    <label className="tbd-checkbox-label">
                      <input type="checkbox" checked={importDifficulties.includes('HARD')} onChange={() => toggleArrayItem(importDifficulties, setImportDifficulties, 'HARD')} /> Khó
                    </label>
                  </div>

                </div>
              </div>

              <div className="tbd-match-counter">
                Tìm thấy <strong>{matchedImportQuestions.length}</strong> câu hỏi phù hợp với tiêu chí đã chọn.
              </div>

            </div>

            <div className="tbd-modal-footer" style={{ marginTop: '20px' }}>
              <button className="tbd-btn-secondary" onClick={() => setIsBankImportModalOpen(false)}>Hủy bỏ</button>
              <button 
                className="tbd-btn-primary" 
                onClick={handleSubmitBankImport}
                disabled={matchedImportQuestions.length === 0 || isSubmittingBankImport}
                style={{ opacity: matchedImportQuestions.length === 0 ? 0.5 : 1 }}
              >
                <FaCloudDownloadAlt /> {isSubmittingBankImport ? 'Đang xử lý...' : `Import ${matchedImportQuestions.length} câu`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input ẩn file Excel */}
      <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />

      {/* BREADCRUMB */}
      <div className="tbd-breadcrumb">
        <Link to="/teacher-dashboard" className="tbd-breadcrumb-link"><FaHome /> Bảng điều khiển</Link>
        <FaChevronRight className="tbd-breadcrumb-icon" size={10} />
        <span onClick={() => navigate(-1)} className="tbd-breadcrumb-clickable">Lớp {bankInfo?.classCode || bankInfo?.classId?.substring(0,8)}</span>
        <FaChevronRight className="tbd-breadcrumb-icon" size={10} />
        <span className="tbd-breadcrumb-active">{bankInfo?.name}</span>
      </div>

      {/* HEADER */}
      <div className="tbd-header-area">
        <div className="tbd-title-wrapper">
          <h1 className="tbd-title"><FaDatabase color="#8b5cf6" /> {bankInfo?.name}</h1>
          <div className="tbd-stats">
            <span className="tbd-stat-item">Tổng: <strong>{questions.length}</strong></span>
            <span className="tbd-stat-item">Trắc nghiệm: <strong>{questions.filter(q => q.type === 'MULTIPLE_CHOICE').length}</strong></span>
            <span className="tbd-stat-item">Tự luận: <strong>{questions.filter(q => q.type === 'ESSAY').length}</strong></span>
          </div>
        </div>
        
        <div className="tbd-action-group">
          <button className="tbd-btn-secondary" onClick={handleRemoveDuplicates} style={{ borderColor: '#f59e0b', color: '#f59e0b' }} disabled={isImporting}>
            <FaBroom /> {isImporting ? 'Đang xử lý...' : 'Dọn dẹp trùng'}
          </button>
          
          {/* Nút Xuất Excel giữ nguyên */}
          <button className="tbd-btn-secondary" onClick={handleExportExcel}>
            <FaFileImport /> Xuất Excel
          </button>
          
          {/* KHU VỰC DROPDOWN IMPORT */}
          <div className="tbd-dropdown-wrapper" ref={importDropdownRef}>
            <button 
              className="tbd-btn-secondary" 
              onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
            >
              <FaCloudDownloadAlt /> Import câu hỏi <FaChevronDown size={12} style={{ marginLeft: '4px' }} />
            </button>
            
            {isImportDropdownOpen && (
              <div className="tbd-dropdown-menu">
                <button 
                  className="tbd-dropdown-item" 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsImportDropdownOpen(false); // Đóng menu sau khi click
                  }} 
                  disabled={isImporting}
                >
                  <FaFileImport className="tbd-dropdown-icon" color="#10b981" /> 
                  {isImporting ? 'Đang xử lý...' : 'Từ file Excel (.xlsx)'}
                </button>
                
                <button 
                  className="tbd-dropdown-item" 
                  onClick={() => {
                    openBankImportModal();
                    setIsImportDropdownOpen(false); // Đóng menu sau khi click
                  }}
                >
                  <FaDatabase className="tbd-dropdown-icon" color="#8b5cf6" /> 
                  Từ Ngân hàng khác
                </button>
              </div>
            )}
          </div>

          <button onClick={openCreateModal} className="tbd-btn-primary">
            <FaPlus /> Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* TÌM KIẾM & LỌC */}
      <div className="tbd-toolbar">
        <div className="tbd-search-box">
          <FaSearch color="#94a3b8" />
          <input type="text" placeholder="Tìm kiếm nội dung..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="tbd-filter-group">
          {selectedQuestions.length > 0 && (
            <button onClick={handleBulkDelete} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaRegTrashAlt /> Xóa {selectedQuestions.length} mục
            </button>
          )}
          <select className="tbd-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="ALL">Tất cả loại câu</option>
            <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
            <option value="ESSAY">Tự luận</option>
          </select>
          <select className="tbd-filter-select" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
            <option value="ALL">Tất cả độ khó</option>
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
        </div>
      </div>

      {/* BẢNG CÂU HỎI */}
      <div className="tbd-table-container">
        {paginatedQuestions.length === 0 ? (
          <div className="tbd-empty-state">Không tìm thấy câu hỏi nào phù hợp.</div>
        ) : (
          <table className="tbd-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', paddingLeft: '15px' }}>
                  <input type="checkbox" checked={isAllOnPageSelected} ref={input => { if (input) input.indeterminate = isSomeOnPageSelected && !isAllOnPageSelected; }} onChange={handleToggleSelectAll} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                </th>
                <th className="tbd-col-id">#</th>
                <th className="tbd-col-type">Loại</th>
                <th className="tbd-col-content">Nội dung câu hỏi</th>
                <th className="tbd-col-difficulty">Độ khó</th>
                <th className="tbd-col-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.map((q, index) => {
                const diffProps = getDifficultyProps(q.difficulty);
                const actualIndex = (currentPage - 1) * PAGE_SIZE + index + 1; 
                const isSelected = selectedQuestions.includes(q.id);
                
                return (
                  <tr key={q.id} style={{ backgroundColor: isSelected ? '#eff6ff' : '' }}>
                    <td style={{ textAlign: 'center', paddingLeft: '15px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelectRow(q.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    </td>
                    <td className="tbd-col-id">{actualIndex}</td>
                    <td className="tbd-col-type">
                      <span className="tbd-badge-type">
                        {q.type === 'MULTIPLE_CHOICE' ? <FaRegCheckCircle size={14} color="#3b82f6"/> : <FaListUl size={14} color="#f59e0b"/>}
                        {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'}
                      </span>
                    </td>
                    <td className="tbd-col-content" title="Nhấn để xem/sửa chi tiết" onClick={() => openEditModal(q)}>
                      {q.content}
                    </td>
                    <td className="tbd-col-difficulty">
                      <span className={`tbd-badge-diff ${diffProps.class}`}>{diffProps.label}</span>
                    </td>
                    <td className="tbd-col-actions">
                      <div className="tbd-table-actions">
                        <button className="tbd-btn-icon edit" onClick={() => openEditModal(q)} title="Chỉnh sửa"><FaRegEdit size={16} /></button>
                        <button className="tbd-btn-icon delete" onClick={() => deleteQuestion(q.id)} title="Xóa"><FaRegTrashAlt size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="tbd-pagination">
          <button className="tbd-page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><FaChevronLeft size={12} /></button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={`tbd-page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
          ))}
          <button className="tbd-page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><FaChevronRight size={12} /></button>
        </div>
      )}

      {/* MODAL TẠO / SỬA CÂU HỎI */}
      {isModalOpen && (
        <div className="tbd-modal-overlay">
          <div className="tbd-modal-content">
            <div className="tbd-modal-header">
              <h2 className="tbd-modal-title">{editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="tbd-modal-close"><FaTimes size={20}/></button>
            </div>
            <form onSubmit={handleSubmitForm} className="tbd-form">
              <div className="tbd-form-row">
                <div className="tbd-form-group">
                  <label className="tbd-form-label">Loại câu hỏi</label>
                  <select value={formData.questionType} onChange={e => setFormData({...formData, questionType: e.target.value})} className="tbd-form-select">
                    <option value="MULTIPLE_CHOICE">Trắc nghiệm (1 đáp án đúng)</option>
                    <option value="ESSAY">Tự luận</option>
                  </select>
                </div>
                <div className="tbd-form-group">
                  <label className="tbd-form-label">Độ khó</label>
                  <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="tbd-form-select">
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
              </div>
              <div className="tbd-form-group">
                <label className="tbd-form-label">Nội dung câu hỏi <span style={{color:'red'}}>*</span></label>
                <textarea rows={4} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Nhập nội dung câu hỏi..." className="tbd-form-textarea" />
              </div>
              {formData.questionType === 'MULTIPLE_CHOICE' && (
                <div className="tbd-config-box">
                  <span className="tbd-config-header">Các đáp án (Đánh dấu vào ô tròn để chọn đáp án đúng)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {formData.options.map((opt, index) => (
                      <div key={opt.id} className="tbd-option-input-row">
                        <div onClick={() => handleSetCorrectOption(opt.id)} className={`tbd-radio-btn ${opt.isCorrect ? 'selected' : ''}`}>
                          {opt.isCorrect && <div className="tbd-radio-inner"></div>}
                        </div>
                        <input type="text" value={opt.text} onChange={e => handleChangeOptionText(opt.id, e.target.value)} placeholder={`Nhập đáp án ${String.fromCharCode(65 + index)}...`} className="tbd-form-input" style={{ borderColor: opt.isCorrect ? '#22c55e' : '#cbd5e1' }} />
                        <button type="button" onClick={() => handleRemoveOption(opt.id)} className="tbd-btn-remove-option" title="Xóa đáp án"><FaTimes size={16}/></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setFormData({ ...formData, options: [...formData.options, { id: `opt_${Date.now()}`, text: '', isCorrect: false }] })} className="tbd-btn-add-option"><FaPlus size={10} /> Thêm đáp án khác</button>
                </div>
              )}
            </form>
            <div className="tbd-modal-footer">
              <button type="button" onClick={() => setIsModalOpen(false)} className="tbd-btn-secondary">Hủy</button>
              <button type="button" onClick={handleSubmitForm} className="tbd-btn-primary">Lưu câu hỏi</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}