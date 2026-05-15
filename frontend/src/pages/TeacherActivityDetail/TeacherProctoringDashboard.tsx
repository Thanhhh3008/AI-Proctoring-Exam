import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { io, Socket } from 'socket.io-client';
import { FaArrowLeft, FaSpinner, FaTimes, FaSearch, FaFileExcel, FaCircle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './TeacherProctoringDashboard.css';

// Tên hiển thị Tiếng Việt cho từng loại vi phạm
const VIOLATION_LABELS: Record<string, string> = {
  TAB_SWITCH: 'Rời màn hình/Chuyển tab',
  FULLSCREEN_EXITED: 'Thoát toàn màn hình',
  COPY_PASTE: 'Thao tác chặn',
  MULTIPLE_FACES: 'Phát hiện nhiều người',
  NO_FACE: 'Không thấy mặt',
  DIFFERENT_PERSON: 'Sai người thi',
  LOOKING_AWAY: 'Nghi vấn nhìn chỗ khác',
  PHONE_DETECTED: 'Dùng điện thoại',
  STATIC_IMAGE: 'Sử dụng ảnh tĩnh',
};

const VIOLATION_COLORS: Record<string, string> = {
  TAB_SWITCH: '#f59e0b',
  FULLSCREEN_EXITED: '#8b5cf6',
  COPY_PASTE: '#6366f1',
  MULTIPLE_FACES: '#ef4444',
  NO_FACE: '#64748b',
  DIFFERENT_PERSON: '#dc2626',
  LOOKING_AWAY: '#f97316',
  PHONE_DETECTED: '#dc2626',
  STATIC_IMAGE: '#0ea5e9',
};

export default function TeacherProctoringDashboard() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const BACKEND_URL = 'http://localhost:3000';

  const resolveImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'violations' | 'clean'>('all');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false); // Trạng thái kết nối WebSocket
  const socketRef = useRef<Socket | null>(null);

  // Hàm fetch lại dữ liệu từ API
  const refreshData = async () => {
    try {
      const [statsRes, summaryRes] = await Promise.all([
        axiosClient.get(`/proctoring/exam/${examId}/stats`),
        axiosClient.get(`/proctoring/exam/${examId}/summary`),
      ]);
      setStats(statsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('[ProctoringDashboard] Lỗi refresh dữ liệu:', err);
    }
  };

  // Lấy dữ liệu ban đầu khi tải trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, summaryRes, examRes] = await Promise.all([
          axiosClient.get(`/proctoring/exam/${examId}/stats`),
          axiosClient.get(`/proctoring/exam/${examId}/summary`),
          axiosClient.get(`/exams/${examId}`),
        ]);
        setStats(statsRes.data);
        setSummary(summaryRes.data);
        setExamInfo(examRes.data);
      } catch (err) {
        console.error('[ProctoringDashboard] Lỗi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  // Kết nối WebSocket để nhận cập nhật real-time
  useEffect(() => {
    if (!examId) return;

    const socket = io('http://localhost:3000/proctoring', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsLive(true);
      socket.emit('join:teacher-monitor', { examId });
      console.log('[WS-Teacher] Đã kết nối và vào phòng giám sát:', examId);
    });

    socket.on('disconnect', () => {
      setIsLive(false);
      console.log('[WS-Teacher] Mất kết nối');
    });

    // Khi có vi phạm mới từ bất kỳ sinh viên nào trong kỳ thi này
    socket.on('violation:alert', async (data: any) => {
      console.log('[WS-Teacher] Vi phạm mới:', data);
      // Fetch lại toàn bộ stats để cập nhật bảng
      await refreshData();
    });

    // Khi có sinh viên mới vào phòng thi
    socket.on('student:joined', async () => {
      await refreshData();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [examId]);

  if (loading) {
    return (
      <div className="pd-page-container">
        <div className="pd-loading">
          <FaSpinner className="fa-spin" style={{ fontSize: 32, color: '#6366f1' }} />
          <p style={{ marginTop: 16 }}>Đang khởi tạo báo cáo giám sát...</p>
        </div>
      </div>
    );
  }

  const filteredStats = stats.filter(s => {
    const matchesFilter = filter === 'all' || (filter === 'violations' ? s.totalViolations > 0 : s.totalViolations === 0);
    const matchesSearch = s.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getViolationLevel = (count: number) => {
    if (count === 0) return 'none';
    if (count <= 3) return 'warn';
    return 'danger';
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const maxTypeCount = summary?.violationsByType
    ? Math.max(...Object.values(summary.violationsByType as Record<string, number>), 1)
    : 1;

  // ============================================
  // XUẤT EXCEL
  // ============================================
  const handleExportExcel = () => {
    if (!summary || !stats) return;

    // 1. Sheet 1: Tổng quan
    const summaryData = [
      ['BÁO CÁO GIÁM SÁT KỲ THI'],
      ['Thời điểm xuất:', new Date().toLocaleString('vi-VN')],
      [],
      ['THÔNG SỐ CHUNG'],
      ['Tổng sinh viên tham gia', summary.totalStudents],
      ['Tổng số vi phạm ghi nhận', summary.totalViolations],
      ['Số sinh viên có vi phạm', summary.studentsWithViolations],
      ['Số sinh viên sạch', summary.totalStudents - summary.studentsWithViolations],
      [],
      ['TOP SINH VIÊN VI PHẠM NHIỀU NHẤT'],
      ['Họ tên', 'Email', 'Số lỗi'],
      ...stats
        .sort((a, b) => b.totalViolations - a.totalViolations)
        .slice(0, 10)
        .filter(s => s.totalViolations > 0)
        .map(s => [s.student.fullName, s.student.email, s.totalViolations])
    ];

    // 2. Sheet 2: Chi tiết từng lỗi
    const detailHeader = ['STT', 'Họ tên', 'Email', 'Loại vi phạm', 'Thời gian', 'Bằng chứng (URL)'];
    const detailData: any[] = [];
    let stt = 1;

    stats.forEach(s => {
      s.violations.forEach((v: any) => {
        detailData.push([
          stt++,
          s.student.fullName,
          s.student.email,
          VIOLATION_LABELS[v.type] || v.type,
          new Date(v.timestamp).toLocaleString('vi-VN'),
          v.evidenceUrl || 'Không có'
        ]);
      });
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    const ws2 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailData]);

    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết vi phạm');

    const rawTitle = examInfo?.title || 'Bao_cao_giam_sat';
    const safeTitle = rawTitle.replace(/\s+/g, '_').replace(/[/\\?%*:|"<>]/g, '');
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const fileName = 'Bao_cao_giam_sat_Ky_Thi ' + `${safeTitle}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="pd-page-container">
      <div className="pd-content-max">
        {/* NAVIGATION */}
        {/* BACK BUTTON */}
        <div className="pd-nav" style={{ marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', color: '#6366f1',
              display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer', padding: '0', fontSize: '14px', fontWeight: 600,
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateX(-4px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
          >
            <FaArrowLeft /> Quay lại
          </button>
        </div>

        {/* HEADER */}
        <div className="pd-header-row">
          <div className="pd-title-group">
            <h1 style={{ fontSize: '28px', color: '#0f172a' }}>
              Đang giám sát: <span style={{ color: '#6366f1' }}>{examInfo?.title || 'Đang tải...'}</span>
            </h1>
            <p style={{ fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Mã kỳ thi: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{examId}</code>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                background: isLive ? '#dcfce7' : '#fee2e2',
                color: isLive ? '#15803d' : '#dc2626',
              }}>
                <FaCircle style={{ fontSize: 7, animation: isLive ? 'pulse 1.5s infinite' : 'none' }} />
                {isLive ? 'LIVE — Đang nhận cập nhật tự động' : 'OFFLINE — Mất kết nối real-time'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="pd-action-btn"
              onClick={handleExportExcel}
              style={{ background: '#10b981', color: 'white', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaFileExcel /> Xuất báo cáo Excel
            </button>
            <button className="pd-action-btn" onClick={() => navigate(-1)}>
              Quay lại kỳ thi
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="pd-stats-grid">
          <div className="pd-kpi-card accent-blue">
            <span className="pd-kpi-label">Tổng sinh viên</span>
            <span className="pd-kpi-value">{summary?.totalStudents || 0}</span>
          </div>
          <div className="pd-kpi-card accent-red">
            <span className="pd-kpi-label">Tổng số vi phạm</span>
            <span className="pd-kpi-value">{summary?.totalViolations || 0}</span>
          </div>
          <div className="pd-kpi-card accent-orange">
            <span className="pd-kpi-label">Sinh viên vi phạm</span>
            <span className="pd-kpi-value">{summary?.studentsWithViolations || 0}</span>
          </div>
          <div className="pd-kpi-card accent-green">
            <span className="pd-kpi-label">Hoàn thành sạch</span>
            <span className="pd-kpi-value">{(summary?.totalStudents || 0) - (summary?.studentsWithViolations || 0)}</span>
          </div>
        </div>

        <div className="pd-main-layout">
          {/* LEFT: STUDENT LIST */}
          <div className="pd-section-card">
            <div className="pd-section-header">
              <h2>Danh sách chi tiết</h2>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
                  <input
                    type="text"
                    placeholder="Tìm sinh viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', width: '200px' }}
                  />
                </div>
                <div className="pd-pills">
                  <button className={`pd-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
                  <button className={`pd-pill ${filter === 'violations' ? 'active' : ''}`} onClick={() => setFilter('violations')}>Có lỗi</button>
                  <button className={`pd-pill ${filter === 'clean' ? 'active' : ''}`} onClick={() => setFilter('clean')}>Sạch</button>
                </div>
              </div>
            </div>

            <div className="pd-table-container">
              <table className="pd-table-modern">
                <thead>
                  <tr>
                    <th>Thí sinh</th>
                    <th>Trạng thái</th>
                    <th>Mức độ vi phạm</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStats.map((s) => (
                    <tr key={s.sessionId}>
                      <td>
                        <div className="pd-user-info">
                          <div className="pd-user-avatar">
                            {s.student.avatarUrl ? (
                              <img src={resolveImageUrl(s.student.avatarUrl)} alt="" />
                            ) : (
                              getInitials(s.student.fullName)
                            )}
                          </div>
                          <div className="pd-user-details">
                            <span className="name">{s.student.fullName}</span>
                            <span className="email">{s.student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`pd-badge pd-badge-status ${s.status === 'IN_PROGRESS' ? 'ongoing' : ''}`}>
                          {s.status === 'IN_PROGRESS' ? 'Đang thi' : 'Đã nộp bài'}
                        </span>
                      </td>
                      <td>
                        <span className={`pd-violation-tag ${getViolationLevel(s.totalViolations)}`}>
                          {s.totalViolations === 0 ? 'Chưa ghi nhận' : `${s.totalViolations} lỗi được báo cáo`}
                        </span>
                      </td>
                      <td>
                        <button className="pd-action-btn" onClick={() => setSelectedSession(s)}>
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStats.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Không tìm thấy thí sinh nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: ANALYTICS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="pd-section-card pd-chart-card">
              <span className="pd-chart-title">Phân tích loại lỗi</span>
              <div className="pd-chart-bars">
                {summary?.violationsByType && Object.entries(summary.violationsByType as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="pd-bar-row">
                      <div className="pd-bar-info">
                        <span className="pd-bar-label">{VIOLATION_LABELS[type] || type}</span>
                        <span className="pd-bar-count">{count}</span>
                      </div>
                      <div className="pd-bar-bg">
                        <div
                          className="pd-bar-fill"
                          style={{
                            width: `${(count / maxTypeCount) * 100}%`,
                            background: VIOLATION_COLORS[type] || '#94a3b8'
                          }}
                        />
                      </div>
                    </div>
                  ))
                }
                {(!summary?.violationsByType || Object.keys(summary.violationsByType).length === 0) && (
                  <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: '20px 0' }}>Chưa có dữ liệu phân tích</p>
                )}
              </div>
            </div>

            <div className="pd-section-card" style={{ padding: '24px' }}>
              <span className="pd-chart-title">Ghi chú giám sát</span>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ fontSize: 13, color: '#475569', display: 'flex', gap: '10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', marginTop: 6 }} />
                  Dữ liệu vi phạm được cập nhật theo thời gian thực từ máy sinh viên.
                </li>
                <li style={{ fontSize: 13, color: '#475569', display: 'flex', gap: '10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', marginTop: 6 }} />
                  Hệ thống ghi nhận vi phạm dựa trên AI và các sự kiện trình duyệt.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* TIMELINE MODAL */}
      {selectedSession && (
        <div className="pd-modal-v2" onClick={() => setSelectedSession(null)}>
          <div className="pd-modal-content" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-head">
              <h3>Báo cáo vi phạm</h3>
              <button className="pd-close-icon" onClick={() => setSelectedSession(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="pd-modal-body">
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedSession.student.fullName}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{selectedSession.student.email}</div>
              </div>

              <div className="pd-timeline-v2">
                {selectedSession.violations.map((v: any, i: number) => (
                  <div key={i} className="pd-t-item">
                    <div className="pd-t-time">
                      {new Date(v.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="pd-t-content">
                      <span className="pd-t-label">{VIOLATION_LABELS[v.type] || v.type}</span>
                      {/* EVIDENCE PHOTO — So sánh 2 ảnh nếu là DIFFERENT_PERSON */}
                      {v.evidenceUrl && (
                        <div style={{ marginTop: 10 }}>
                          {v.type === 'DIFFERENT_PERSON' && selectedSession.referencePhoto ? (
                            // So sánh 2 ảnh song song
                            <div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>✅ Ảnh gốc (Đã đăng ký)</div>
                                  <img
                                    src={resolveImageUrl(selectedSession.referencePhoto)}
                                    alt="Ảnh gốc"
                                    onClick={() => setLightboxUrl(resolveImageUrl(selectedSession.referencePhoto)!)}
                                    style={{
                                      width: 130, height: 90, objectFit: 'cover',
                                      borderRadius: 8, cursor: 'zoom-in',
                                      border: '2px solid #22c55e',
                                    }}
                                    title="Ảnh đã đăng ký khi bắt đầu thi"
                                  />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 36, color: '#ef4444', fontWeight: 700, fontSize: 18 }}>≠</div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>⚠️ Ảnh phát hiện (Lúc thi) </div>
                                  <img
                                    src={v.evidenceUrl}
                                    alt="Bằng chứng vi phạm"
                                    onClick={() => setLightboxUrl(v.evidenceUrl)}
                                    style={{
                                      width: 130, height: 90, objectFit: 'cover',
                                      borderRadius: 8, cursor: 'zoom-in',
                                      border: '2px solid #ef4444',
                                    }}
                                    title="Nhấn để xem to"
                                  />
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Nhấn ảnh để xem to</div>
                            </div>
                          ) : (
                            // Ảnh đơn cho các vi phạm khác
                            <>
                              <img
                                src={v.evidenceUrl}
                                alt="Bằng chứng"
                                onClick={() => setLightboxUrl(v.evidenceUrl)}
                                style={{
                                  width: 140, height: 80, objectFit: 'cover',
                                  borderRadius: 8, cursor: 'zoom-in',
                                  border: '2px solid #e2e8f0',
                                  transition: 'border-color 0.2s',
                                }}
                                onMouseOver={e => (e.currentTarget.style.borderColor = '#6366f1')}
                                onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                                title="Nhấn để xem ảnh toàn màn hình"
                              />
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Nhấn ảnh để xem to</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX - Xem ảnh bằng chứng toàn màn hình */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: 24,
          }}
        >
          <img
            src={lightboxUrl}
            alt="Bằng chứng vi phạm"
            style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 12 }}
          />
          <p style={{ color: '#94a3b8', marginTop: 16, fontSize: 14 }}>Nhấn bất kỳ đâu để đóng</p>
        </div>
      )}
    </div>
  );
}
