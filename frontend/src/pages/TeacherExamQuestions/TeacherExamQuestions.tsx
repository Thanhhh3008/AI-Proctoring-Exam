import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaChevronRight, FaDatabase, 
  FaFileImport, FaRegTrashAlt, FaTimes, FaCheck, 
  FaListUl, FaRegCheckCircle, FaSearch, FaChevronDown, FaFileExcel,
  FaChevronLeft, FaCloudDownloadAlt, FaEye, FaClipboardList, FaBroom
} from 'react-icons/fa';
import './TeacherExamQuestions.css'; 
import axiosClient from '../../api/axiosClient';

export default function TeacherExamQuestions() {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Bulk Delete
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  // Modal View Detail (Read-only)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState<any>(null);

  // App Modal
  const [appModal, setAppModal] = useState({
    isOpen: false, isConfirm: false, isSuccess: false,
    title: '', message: '', confirmText: 'Đóng', onConfirm: () => {}
  });
const closeAppModal = () => {
    setAppModal(prev => ({ ...prev, isOpen: false }));
  };

  // Import Modal State
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isBankImportModalOpen, setIsBankImportModalOpen] = useState(false);
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);
  const [selectedSourceBankIds, setSelectedSourceBankIds] = useState<string[]>([]);
  const [sourceQuestionsPool, setSourceQuestionsPool] = useState<any[]>([]);
  
  const [importTypes, setImportTypes] = useState<string[]>(['MULTIPLE_CHOICE', 'ESSAY']);
  const [importDifficulties, setImportDifficulties] = useState<string[]>(['EASY', 'MEDIUM', 'HARD']);
  const [isSubmittingBankImport, setIsSubmittingBankImport] = useState(false);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const examRes = await axiosClient.get(`/exams/${examId}`);
        setExamInfo(examRes.data);
        
        const rawQuestions = examRes.data.examQuestions?.map((eq: any) => eq.question) || [];
        setQuestions(rawQuestions);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Không thể tải dữ liệu Bài thi!', confirmText: 'Đóng', onConfirm: closeAppModal });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  // Click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setIsImportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedQuestions([]); 
  }, [searchQuery, filterType, filterDifficulty]);

  // ==========================================
  // BANK IMPORT LOGIC
  // ==========================================
  const openBankImportModal = async () => {
    setIsBankImportModalOpen(true);
    setSelectedSourceBankIds([]);
    setSourceQuestionsPool([]);
    try {
      if(examInfo?.classId) {
        const res = await axiosClient.get(`/classes/${examInfo.classId}/question-banks`);
        setAvailableBanks(res.data);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách ngân hàng:", error);
    }
  };

  const handleAddSourceBank = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id || selectedSourceBankIds.includes(id)) return;
    setSelectedSourceBankIds(prev => [...prev, id]);
    e.target.value = ""; 
  };

  const handleRemoveSourceBank = (idToRemove: string) => {
    setSelectedSourceBankIds(prev => prev.filter(id => id !== idToRemove));
  };

  useEffect(() => {
    const fetchQuestionsForSelectedBanks = async () => {
      if (selectedSourceBankIds.length === 0) {
        setSourceQuestionsPool([]);
        return;
      }
      try {
        let allQuestions: any[] = [];
        for (const sourceId of selectedSourceBankIds) {
          const res = await axiosClient.get(`/question-banks/${sourceId}`);
          if (res.data && res.data.questions) {
            allQuestions = [...allQuestions, ...res.data.questions];
          }
        }
        setSourceQuestionsPool(allQuestions);
      } catch (error) {}
    };
    fetchQuestionsForSelectedBanks();
  }, [selectedSourceBankIds]); 

  const toggleArrayItem = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (arr.includes(val)) setArr(arr.filter(item => item !== val));
    else setArr([...arr, val]);
  };

  const matchedImportQuestions = sourceQuestionsPool.filter(q => 
    importTypes.includes(q.type || q.questionType) && 
    importDifficulties.includes(q.difficulty)
  );

  const handleSubmitBankImport = async () => {
    if (matchedImportQuestions.length === 0) return;
    setIsSubmittingBankImport(true);

    try {
      let successCount = 0;
      for (const q of matchedImportQuestions) {
        const payload = {
          type: q.type || q.questionType,
          difficulty: q.difficulty,
          content: q.content,
          options: q.options
        };
        await axiosClient.post(`/exams/${examId}/import-question`, payload);
        successCount++;
      }

      setAppModal({
        isOpen: true, isConfirm: false, isSuccess: true,
        title: 'Thành công', message: `Đã import thành công ${successCount} câu hỏi!`,
        confirmText: 'Đóng', onConfirm: closeAppModal
      });
      
      const examRes = await axiosClient.get(`/exams/${examId}`);
      const rawQuestions = examRes.data.examQuestions?.map((eq: any) => eq.question) || [];
      setQuestions(rawQuestions);
      setIsBankImportModalOpen(false);

    } catch (error) {
      setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Lỗi khi import dữ liệu!', confirmText: 'Đóng', onConfirm: closeAppModal });
    } finally {
      setIsSubmittingBankImport(false);
    }
  };

  // ==========================================
  // EXCEL IMPORT LOGIC
  // ==========================================
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);
        if (rawData.length === 0) return alert("File trống");

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
          try { await axiosClient.post(`/exams/${examId}/import-question`, q); successCount++; } catch (err) {}
        }
        
        setAppModal({ isOpen: true, isConfirm: false, isSuccess: true, title: 'Hoàn tất', message: `Import thành công ${successCount} câu.`, confirmText: 'Đóng', onConfirm: closeAppModal });
        
        const examRes = await axiosClient.get(`/exams/${examId}`);
        const rawQuestions = examRes.data.examQuestions?.map((eq: any) => eq.question) || [];
        setQuestions(rawQuestions);
      } catch (error) {
        setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'File không hợp lệ.', confirmText: 'Đóng', onConfirm: closeAppModal });
      } finally {
        setIsImporting(false);
        if (excelInputRef.current) excelInputRef.current.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    if (questions.length === 0) return alert("Không có câu hỏi");
    const excelData = questions.map((q, index) => {
      let optionsText = "", correctAns = "";
      if (q.type === 'MULTIPLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
        if (q.options) {
          optionsText = q.options.map((opt: any, i: number) => `${String.fromCharCode(65 + i)}. ${opt.text}`).join(' | ');
          correctAns = q.options.find((opt: any) => opt.isCorrect)?.text || "";
        }
      }
      return {
        "STT": index + 1, "Loại câu hỏi": (q.type === 'MULTIPLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') ? "Trắc nghiệm" : "Tự luận",
        "Độ khó": q.difficulty === 'EASY' ? "Dễ" : q.difficulty === 'HARD' ? "Khó" : "Trung bình",
        "Nội dung câu hỏi": q.content, "Các lựa chọn (Trắc nghiệm)": optionsText, "Đáp án đúng": (q.type === 'MULTIPLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') ? correctAns : "(Tự luận)",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách câu hỏi");
    worksheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 50 }, { wch: 40 }, { wch: 20 }];
    XLSX.writeFile(workbook, `DeThi_${examInfo?.title || 'Export'}.xlsx`);
  };

  // ==========================================
  // XÓA TRÙNG LẶP LOGIC
  // ==========================================
// ==========================================
  // XÓA TRÙNG LẶP LOGIC (Đã sửa lỗi trắng trang 100%)
  // ==========================================
  const handleRemoveDuplicates = async () => {
    setIsCleaning(true);
    try {
      const uniqueMap = new Map();
      const duplicatesToDelete: string[] = [];

      questions.forEach(q => {
        const type = q.type || q.questionType;
        const uniqueKey = `${q.content.trim().toLowerCase()}_${type}`;
        
        if (uniqueMap.has(uniqueKey)) {
          duplicatesToDelete.push(q.id);
        } else {
          uniqueMap.set(uniqueKey, q.id);
        }
      });

      if (duplicatesToDelete.length === 0) {
        setIsCleaning(false); // Trả lại trạng thái nút
        setAppModal({ 
          isOpen: true, isConfirm: false, isSuccess: true, 
          title: 'Hoàn tất', message: 'Không phát hiện câu hỏi trùng lặp nào trong đề thi!', 
          confirmText: 'Đóng', onConfirm: closeAppModal 
        });
        return;
      }

      setAppModal({
        isOpen: true, 
        isConfirm: true, 
        isSuccess: false, 
        title: 'Phát hiện trùng lặp', 
        message: `Hệ thống tìm thấy ${duplicatesToDelete.length} câu hỏi bị trùng lặp nội dung. Bạn có muốn dọn dẹp ngay?`, 
        confirmText: 'Dọn dẹp',
        
        // KHI BẤM XÁC NHẬN DỌN DẸP
        onConfirm: async () => {
          try {
            await axiosClient.delete(`/exams/${examId}/remove-duplicates`);
            
            setQuestions(questions.filter(q => !duplicatesToDelete.includes(q.id)));
            setSelectedQuestions([]); 
            
            setAppModal({ 
              isOpen: true, isConfirm: false, isSuccess: true, 
              title: 'Thành công', message: `Đã dọn dẹp ${duplicatesToDelete.length} câu trùng lặp!`, 
              confirmText: 'Đóng', onConfirm: closeAppModal 
            });
          } catch (error) {
            setAppModal({ 
              isOpen: true, isConfirm: false, isSuccess: false, 
              title: 'Lỗi', message: 'Có lỗi trong quá trình dọn dẹp.', 
              confirmText: 'Đóng', onConfirm: closeAppModal 
            });
          } finally {
            setIsCleaning(false); // Xong xuôi thì nhả nút ra
          }
        },
        
        // KHI BẤM HỦY BỎ (Bổ sung thuộc tính tự định nghĩa)
        onCancel: () => {
          setIsCleaning(false); // Nhả nút ngay lập tức
          closeAppModal();      // Đóng cửa sổ Modal
        }
      } as any); // Dùng "as any" để TypeScript không báo lỗi thuộc tính tự chế

    } catch (error) {
      setIsCleaning(false);
    }
  };

  // ==========================================
  // VIEW & DELETE LOGIC
  // ==========================================
  const openViewModal = (q: any) => {
    setViewingQuestion(q);
    setIsViewModalOpen(true);
  };

  const deleteQuestion = (questionIdToRemove: string) => {
    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false, title: 'Xác nhận loại bỏ', 
      message: 'Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?', confirmText: 'Xóa',
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/exams/${examId}/questions/${questionIdToRemove}`);
          setQuestions(questions.filter(q => q.id !== questionIdToRemove));
          setSelectedQuestions(selectedQuestions.filter(qId => qId !== questionIdToRemove)); 
          closeAppModal();
        } catch (error) { 
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Lỗi khi xóa câu hỏi.', confirmText: 'Đóng', onConfirm: closeAppModal });
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedQuestions.length === 0) return;
    setAppModal({
      isOpen: true, isConfirm: true, isSuccess: false, title: 'Xóa nhiều câu hỏi', 
      message: `Bạn đang chuẩn bị loại bỏ ${selectedQuestions.length} câu hỏi khỏi đề thi. Tiếp tục?`,
      confirmText: `Xóa ${selectedQuestions.length} câu`,
      onConfirm: async () => {
        try {
          for (const id of selectedQuestions) {
              await axiosClient.delete(`/exams/${examId}/questions/${id}`);
          }
          setQuestions(questions.filter(q => !selectedQuestions.includes(q.id)));
          setSelectedQuestions([]); 
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: true, title: 'Thành công', message: `Đã loại bỏ ${selectedQuestions.length} câu hỏi.`, confirmText: 'Đóng', onConfirm: closeAppModal });
        } catch (error) {
          setAppModal({ isOpen: true, isConfirm: false, isSuccess: false, title: 'Lỗi', message: 'Có lỗi xảy ra trong quá trình xóa.', confirmText: 'Đóng', onConfirm: closeAppModal });
        }
      }
    });
  };

  // ==========================================
  // RENDERING HELPERS
  // ==========================================
  const getDifficultyProps = (diff: string) => {
    if (diff === 'EASY') return { class: 'teq-diff-easy', label: 'Dễ' };
    if (diff === 'HARD') return { class: 'teq-diff-hard', label: 'Khó' };
    return { class: 'teq-diff-medium', label: 'Trung bình' }; 
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase());
    const type = q.type || q.questionType; 
    const matchType = filterType === 'ALL' || type === filterType;
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

  const isAllOnPageSelected = paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.includes(q.id));
  const isSomeOnPageSelected = paginatedQuestions.some(q => selectedQuestions.includes(q.id));

  // COUNTERS
  const multipleChoiceCount = questions.filter(q => (q.type === 'MULTIPLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE')).length;
  const essayCount = questions.filter(q => (q.type === 'ESSAY' || q.questionType === 'ESSAY')).length;

  if (loading) return <div style={{textAlign: 'center', padding: '50px', color: '#64748b'}}>Đang tải dữ liệu bài thi...</div>;

  return (
    <div className="teq-container">

      {/* APP MODAL */}
      {appModal.isOpen && (
        <div className="teq-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="teq-modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="teq-modal-header">
              <h2 style={{ margin: 0, color: appModal.isSuccess ? '#16a34a' : (appModal.isConfirm ? '#0f172a' : '#dc2626'), fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {appModal.isSuccess && <FaCheck />} {appModal.title}
              </h2>
            </div>
            <div className="teq-modal-body" style={{ color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>{appModal.message}</div>
            <div className="teq-modal-footer">
            {appModal.isConfirm && (
                    <button 
                        className="teq-btn-secondary" 
                        // Nếu có onCancel thì gọi onCancel, không có thì gọi closeAppModal mặc định
                        onClick={(appModal as any).onCancel ? (appModal as any).onCancel : closeAppModal}
                    >
                        Hủy bỏ
                    </button>
                    )}
              <button className="teq-btn-primary" style={{ backgroundColor: appModal.isSuccess ? '#16a34a' : (appModal.isConfirm ? '#dc2626' : '#0f172a') }} onClick={appModal.onConfirm}>{appModal.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      {/* BREADCRUMB */}
      <div className="teq-breadcrumb">
        <Link to="/teacher-dashboard" className="teq-breadcrumb-link"><FaHome /> Bảng điều khiển</Link>
        <FaChevronRight className="teq-breadcrumb-icon" size={10} />
        <span onClick={() => navigate(-1)} style={{cursor: 'pointer'}} className="teq-breadcrumb-link">Cấu hình bài thi</span>
        <FaChevronRight className="teq-breadcrumb-icon" size={10} />
        <span className="teq-breadcrumb-active">Quản lý Câu hỏi</span>
      </div>

      {/* HEADER */}
      <div className="teq-header-area">
        <div>
          <h1 className="teq-title"><FaClipboardList color="#64748b" /> {examInfo?.title || 'Bài thi'}</h1>
          <div className="teq-stats">
            <span className="teq-stat-item">Tổng câu: <strong>{questions.length}</strong></span>
            <span className="teq-stat-item">Trắc nghiệm: <strong>{multipleChoiceCount}</strong></span>
            <span className="teq-stat-item">Tự luận: <strong>{essayCount}</strong></span>
            <span className="teq-stat-item" style={{marginLeft: '15px', borderLeft: '1px solid #cbd5e1', paddingLeft: '15px', borderRadius: 0, borderTop: 0, borderRight: 0, borderBottom: 0}}> 
               Dễ: <strong>{questions.filter(q => q.difficulty === 'EASY').length}</strong>
            </span>
            <span className="teq-stat-item">Trung bình: <strong>{questions.filter(q => q.difficulty === 'MEDIUM').length}</strong></span>
            <span className="teq-stat-item"> Khó: <strong>{questions.filter(q => q.difficulty === 'HARD').length}</strong></span>
          </div>
        </div>
        
        <div className="teq-action-group">
          {/* NÚT XÓA TRÙNG LẶP MỚI */}
          <button 
            className="teq-btn-secondary" 
            onClick={handleRemoveDuplicates}
            disabled={isCleaning || questions.length === 0}
            style={{ color: '#0f172a', borderColor: '#cbd5e1' }}
          >
            <FaBroom color="#0f172a" /> {isCleaning ? 'Đang quét...' : 'Dọn dẹp câu hỏi trùng lặp'}
          </button>

          <button className="teq-btn-secondary" onClick={handleExportExcel}>
            <FaFileImport /> Xuất Excel
          </button>
          
          <div className="teq-dropdown-wrapper" ref={importDropdownRef}>
            <button 
              className="teq-btn-primary" 
              onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
            >
              <FaCloudDownloadAlt /> Import câu hỏi <FaChevronDown size={12} style={{ marginLeft: '4px' }} />
            </button>
            
            {isImportDropdownOpen && (
              <div className="teq-dropdown-menu">
                <button 
                  className="teq-dropdown-item" 
                  onClick={() => {
                    openBankImportModal();
                    setIsImportDropdownOpen(false); 
                  }}
                >
                  <FaDatabase color="#64748b" /> Từ Ngân hàng khác
                </button>
                <button 
                  className="teq-dropdown-item" 
                  onClick={() => {
                    excelInputRef.current?.click();
                    setIsImportDropdownOpen(false);
                  }} 
                  disabled={isImporting}
                >
                  <FaFileExcel color="#16a34a" /> {isImporting ? 'Đang xử lý...' : 'Từ file Excel (.xlsx)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TÌM KIẾM & LỌC */}
      <div className="teq-toolbar">
        <div className="teq-search-box">
          <FaSearch color="#94a3b8" />
          <input type="text" placeholder="Tìm kiếm nội dung câu hỏi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="teq-filter-group">
          
          {/* BỘ ĐẾM KẾT QUẢ LỌC */}
          <div style={{display: 'flex', alignItems: 'center', fontSize: '14px', color: '#64748b', marginRight: '10px'}}>
            Hiển thị <strong><span style={{color: '#0f172a', margin: '0 4px'}}>{filteredQuestions.length}</span></strong> / {questions.length}
          </div>

          {selectedQuestions.length > 0 && (
            <button onClick={handleBulkDelete} style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaRegTrashAlt /> Loại bỏ {selectedQuestions.length} mục
            </button>
          )}
          <select className="teq-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="ALL">Tất cả loại câu</option>
            <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
            <option value="ESSAY">Tự luận</option>
          </select>
          <select className="teq-filter-select" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
            <option value="ALL">Tất cả độ khó</option>
            <option value="EASY">Mức Dễ</option>
            <option value="MEDIUM">Mức Trung bình</option>
            <option value="HARD">Mức Khó</option>
          </select>
        </div>
      </div>

      {/* BẢNG CÂU HỎI */}
      <div className="teq-table-container">
        {paginatedQuestions.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Không có câu hỏi nào thỏa mãn điều kiện.</div>
        ) : (
          <table className="teq-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', paddingLeft: '15px' }}>
                  <input type="checkbox" checked={isAllOnPageSelected} ref={input => { if (input) input.indeterminate = isSomeOnPageSelected && !isAllOnPageSelected; }} onChange={handleToggleSelectAll} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }} />
                </th>
                <th className="teq-col-id">#</th>
                <th className="teq-col-type">Loại câu</th>
                <th className="teq-col-content">Nội dung</th>
                <th className="teq-col-difficulty">Độ khó</th>
                <th className="teq-col-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.map((q, index) => {
                const diffProps = getDifficultyProps(q.difficulty);
                const actualIndex = (currentPage - 1) * PAGE_SIZE + index + 1; 
                const isSelected = selectedQuestions.includes(q.id);
                const qType = q.type || q.questionType;
                
                return (
                  <tr key={q.id} style={{ backgroundColor: isSelected ? '#f8fafc' : '' }}>
                    <td style={{ textAlign: 'center', paddingLeft: '15px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelectRow(q.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }} />
                    </td>
                    <td className="teq-col-id">{actualIndex}</td>
                    <td className="teq-col-type">
                      <span className="teq-badge-type">
                        {qType === 'MULTIPLE_CHOICE' ? <FaRegCheckCircle size={14} color="#64748b"/> : <FaListUl size={14} color="#64748b"/>}
                        {qType === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'}
                      </span>
                    </td>
                    <td className="teq-col-content" style={{cursor: 'pointer'}} onClick={() => openViewModal(q)}>
                      {q.content.length > 80 ? q.content.substring(0, 80) + '...' : q.content}
                    </td>
                    <td className="teq-col-difficulty">
                      <span className={`teq-badge-diff ${diffProps.class}`}>{diffProps.label}</span>
                    </td>
                    <td className="teq-col-actions">
                      <div className="teq-table-actions">
                        <button className="teq-btn-icon view" onClick={() => openViewModal(q)} title="Xem chi tiết"><FaEye size={14} /></button>
                        <button className="teq-btn-icon delete" onClick={() => deleteQuestion(q.id)} title="Loại bỏ"><FaRegTrashAlt size={14} /></button>
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
        <div className="teq-pagination">
          <button className="teq-page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><FaChevronLeft size={10} /></button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={`teq-page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
          ))}
          <button className="teq-page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><FaChevronRight size={10} /></button>
        </div>
      )}

      {/* VIEW MODAL (READ ONLY) */}
      {isViewModalOpen && viewingQuestion && (
        <div className="teq-modal-overlay">
          <div className="teq-modal-content">
            <div className="teq-modal-header">
              <h2 className="teq-modal-title">Chi tiết câu hỏi</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="teq-modal-close"><FaTimes size={20}/></button>
            </div>
            <div className="teq-modal-body">
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <span className={`teq-badge-diff ${getDifficultyProps(viewingQuestion.difficulty).class}`}>{getDifficultyProps(viewingQuestion.difficulty).label}</span>
                <span style={{fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', color: '#475569'}}>
                  {(viewingQuestion.type || viewingQuestion.questionType) === 'MULTIPLE_CHOICE' ? 'TRẮC NGHIỆM' : 'TỰ LUẬN'}
                </span>
              </div>
              
              <div className="teq-view-question">{viewingQuestion.content}</div>
              
              {(viewingQuestion.type || viewingQuestion.questionType) === 'MULTIPLE_CHOICE' && viewingQuestion.options && (
                <div>
                  <div style={{fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase'}}>Các đáp án lựa chọn</div>
                  {viewingQuestion.options.map((opt: any, idx: number) => (
                    <div key={opt.id || idx} className={`teq-view-option ${opt.isCorrect ? 'correct' : ''}`}>
                      <div style={{width: '24px', height: '24px', borderRadius: '50%', background: opt.isCorrect ? '#22c55e' : '#e2e8f0', color: opt.isCorrect ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'}}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div>{opt.text}</div>
                      {opt.isCorrect && <FaCheck style={{marginLeft: 'auto'}} color="#166534" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="teq-modal-footer">
              <button onClick={() => setIsViewModalOpen(false)} className="teq-btn-secondary">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT TỪ NGÂN HÀNG KHÁC */}
      {isBankImportModalOpen && (
        <div className="teq-modal-overlay">
          <div className="teq-modal-content" style={{ width: '600px', maxHeight: 'none' }}>
            <div className="teq-modal-header">
              <h2 className="teq-modal-title">Trích xuất câu hỏi từ Ngân hàng</h2>
              <button onClick={() => setIsBankImportModalOpen(false)} className="teq-modal-close"><FaTimes size={20}/></button>
            </div>

            <div className="teq-modal-body">
              <div>
                <label className="teq-form-label">Chọn nguồn cung cấp (Ngân hàng)</label>
                <select className="teq-form-select" onChange={handleAddSourceBank} value="">
                  <option value="" disabled>-- Bấm để chọn ngân hàng câu hỏi --</option>
                  {availableBanks.map(b => (
                    <option key={b.id} value={b.id} disabled={selectedSourceBankIds.includes(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="teq-tags-container">
                  {selectedSourceBankIds.map(id => {
                    const bank = availableBanks.find(b => b.id === id);
                    return bank ? (
                      <div key={id} className="teq-tag">
                        {bank.name}
                        <div className="teq-tag-close" onClick={() => handleRemoveSourceBank(id)}><FaTimes size={10} /></div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="teq-filter-section">
                <h3 style={{ fontSize: '15px', margin: '0 0 15px 0', color: '#0f172a' }}>Chỉ định tiêu chí trích xuất</h3>
                <div className="teq-checkbox-grid">
                  <div className="teq-checkbox-column">
                    <strong style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Theo loại câu hỏi</strong>
                    <label className="teq-checkbox-label">
                      <input type="checkbox" checked={importTypes.includes('MULTIPLE_CHOICE')} onChange={() => toggleArrayItem(importTypes, setImportTypes, 'MULTIPLE_CHOICE')} style={{accentColor: '#2563EB'}} /> Trắc nghiệm
                    </label>
                    <label className="teq-checkbox-label">
                      <input type="checkbox" checked={importTypes.includes('ESSAY')} onChange={() => toggleArrayItem(importTypes, setImportTypes, 'ESSAY')} style={{accentColor: '#2563EB'}} /> Tự luận
                    </label>
                  </div>

                  <div className="teq-checkbox-column">
                    <strong style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Theo độ khó</strong>
                    <label className="teq-checkbox-label">
                      <input type="checkbox" checked={importDifficulties.includes('EASY')} onChange={() => toggleArrayItem(importDifficulties, setImportDifficulties, 'EASY')} style={{accentColor: '#2563EB'}} /> Mức Dễ
                    </label>
                    <label className="teq-checkbox-label">
                      <input type="checkbox" checked={importDifficulties.includes('MEDIUM')} onChange={() => toggleArrayItem(importDifficulties, setImportDifficulties, 'MEDIUM')} style={{accentColor: '#2563EB'}} /> Mức Trung bình
                    </label>
                    <label className="teq-checkbox-label">
                      <input type="checkbox" checked={importDifficulties.includes('HARD')} onChange={() => toggleArrayItem(importDifficulties, setImportDifficulties, 'HARD')} style={{accentColor: '#2563EB'}} /> Mức Khó
                    </label>
                  </div>
                </div>
              </div>

              <div className="teq-match-counter">
                Hệ thống tìm thấy <strong>{matchedImportQuestions.length}</strong> câu hỏi phù hợp trong các nguồn đã chọn.
              </div>
            </div>

            <div className="teq-modal-footer">
              <button className="teq-btn-secondary" onClick={() => setIsBankImportModalOpen(false)}>Hủy bỏ</button>
              <button 
                className="teq-btn-primary" 
                onClick={handleSubmitBankImport}
                disabled={matchedImportQuestions.length === 0 || isSubmittingBankImport}
                style={{ opacity: matchedImportQuestions.length === 0 ? 0.5 : 1 , marginLeft: "6px"}}
              >
                {isSubmittingBankImport ? 'Đang xử lý...' : `Tiến hành lấy ${matchedImportQuestions.length} câu hỏi`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input ẩn file Excel */}
      <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />

    </div>
  );
}