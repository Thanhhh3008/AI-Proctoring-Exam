// ================================================
// TRANG CAMERA PHỤ - Dành cho điện thoại sinh viên
// Truy cập qua QR Code khi bắt đầu làm bài thi
// ================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './MobileCam.css';

// Khi điện thoại mở trang qua IP (192.168.1.10:5173),
// backend cũng phải dùng cùng IP đó (192.168.1.10:3000)
// Không dùng localhost vì trên điện thoại, localhost = chính điện thoại
// Khi deploy thực tế, URL sẽ được lấy từ biến môi trường (ví dụ: https://my-backend.onrender.com)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = `${API_URL}/proctoring`;
const FRAME_INTERVAL_MS = 3000; // Gửi frame mỗi 3 giây
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;
const FRAME_QUALITY = 0.5; // JPEG quality 50% để tiết kiệm bandwidth

type Phase = 'setup' | 'connecting' | 'active' | 'error';

export default function MobileCam() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';
  const examId = searchParams.get('examId') || '';
  const studentName = searchParams.get('studentName') || 'Sinh viên';

  const [phase, setPhase] = useState<Phase>('setup');
  const [errorMsg, setErrorMsg] = useState('');
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Kiểm tra params hợp lệ
  useEffect(() => {
    if (!sessionId || !examId) {
      setErrorMsg('Link không hợp lệ. Vui lòng quét lại mã QR từ màn hình bài thi.');
      setPhase('error');
    }
  }, [sessionId, examId]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      frameIntervalRef.current && clearInterval(frameIntervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      socketRef.current?.disconnect();
    };
  }, []);

  // ============================================
  // Xin quyền camera và bắt đầu stream
  // ============================================
  const startCamera = async () => {
    setPhase('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Camera sau
          // Bỏ qua strict width/height để tránh lỗi OverconstrainedError trên iOS Safari
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      connectSocket();
    } catch (err: any) {
      console.error("Camera Error:", err);
      let msg = `Lỗi Camera (${err.name}): ${err.message}`;
      if (err.name === 'NotAllowedError') {
        msg = 'Bạn đã từ chối quyền camera. Vui lòng tải lại trang và cho phép.';
      } else if (!navigator.mediaDevices) {
        msg = 'Trình duyệt chặn Camera do kết nối không an toàn. Vui lòng thử lại với HTTPS.';
      }
      setErrorMsg(msg);
      setPhase('error');
    }
  };

  // ============================================
  // Kết nối Socket.io và đăng ký là camera phụ
  // ============================================
  const connectSocket = () => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('mobile:join', { sessionId, examId, studentName });
      setPhase('active');
      startFrameLoop(socket);
    });

    socket.on('disconnect', () => {
      frameIntervalRef.current && clearInterval(frameIntervalRef.current);
      setPhase('error');
      setErrorMsg('Mất kết nối với máy chủ. Vui lòng tải lại trang.');
    });

    socket.on('connect_error', () => {
      setErrorMsg('Không thể kết nối máy chủ. Kiểm tra mạng WiFi và thử lại.');
      setPhase('error');
    });
  };

  // ============================================
  // Vòng lặp chụp và gửi frame
  // ============================================
  const startFrameLoop = useCallback((socket: Socket) => {
    const captureAndSend = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      const frameData = canvas.toDataURL('image/jpeg', FRAME_QUALITY);

      socket.emit('mobile:frame', {
        sessionId,
        examId,
        frameData,
        timestamp: Date.now(),
      });

      setFrameCount(c => c + 1);
      setLastFrameTime(new Date().toLocaleTimeString('vi-VN'));
    };

    frameIntervalRef.current = window.setInterval(captureAndSend, FRAME_INTERVAL_MS);
  }, [sessionId, examId]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="mc-root">
      {/* Canvas ẩn để capture frame */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ===== PHASE: SETUP ===== */}
      {phase === 'setup' && (
        <div className="mc-setup">
          <div className="mc-logo">📱</div>
          <h1 className="mc-title">Camera giám sát phụ</h1>
          <p className="mc-subtitle">Điện thoại của bạn sẽ hoạt động như một camera phụ để hỗ trợ hệ thống giám sát thi.</p>

          <div className="mc-guide-box">
            <div className="mc-guide-title">📌 Hướng dẫn đặt điện thoại</div>
            <div className="mc-guide-steps">
              <div className="mc-step">
                <span className="mc-step-num">1</span>
                <span>Đặt điện thoại <strong>bên cạnh màn hình máy tính</strong>, nghiêng khoảng 45°</span>
              </div>
              <div className="mc-step">
                <span className="mc-step-num">2</span>
                <span>Camera sau hướng vào <strong>khu vực bàn tay và bàn phím</strong></span>
              </div>
              <div className="mc-step">
                <span className="mc-step-num">3</span>
                <span><strong>Không tắt màn hình</strong> và không đóng trình duyệt trong suốt kỳ thi</span>
              </div>
              <div className="mc-step">
                <span className="mc-step-num">4</span>
                <span>Kết nối với <strong>cùng mạng WiFi</strong> với máy tính</span>
              </div>
            </div>
          </div>

          <div className="mc-session-info">
            <div className="mc-info-row">
              <span className="mc-info-label">Sinh viên</span>
              <span className="mc-info-value">{studentName}</span>
            </div>
            <div className="mc-info-row">
              <span className="mc-info-label">Mã phiên thi</span>
              <span className="mc-info-value mc-mono">{sessionId.slice(0, 8)}...</span>
            </div>
          </div>

          <button className="mc-btn-start" onClick={startCamera}>
            ✅ Tôi đã đặt đúng vị trí — Bắt đầu
          </button>
        </div>
      )}

      {/* ===== PHASE: CONNECTING ===== */}
      {phase === 'connecting' && (
        <div className="mc-center">
          <div className="mc-spinner" />
          <p className="mc-connecting-text">Đang kết nối...</p>
        </div>
      )}

      {/* ===== PHASE: ACTIVE ===== */}
      {phase === 'active' && (
        <div className="mc-active">
          <div className="mc-status-bar">
            <div className="mc-live-dot" />
            <span className="mc-live-text">ĐANG GIÁM SÁT</span>
          </div>

          <div className="mc-video-wrapper">
            <video
              ref={videoRef}
              className="mc-video"
              autoPlay
              playsInline
              muted
            />
            <div className="mc-video-overlay">
              <div className="mc-frame-guide" />
            </div>
          </div>

          <div className="mc-stats">
            <div className="mc-stat-item">
              <span className="mc-stat-label">Frame đã gửi</span>
              <span className="mc-stat-value">{frameCount}</span>
            </div>
            <div className="mc-stat-item">
              <span className="mc-stat-label">Lần cuối</span>
              <span className="mc-stat-value">{lastFrameTime || '—'}</span>
            </div>
          </div>

          <div className="mc-warning-box">
            ⚠️ <strong>Không tắt màn hình này.</strong> Việc ngắt kết nối sẽ được ghi nhận là vi phạm.
          </div>
        </div>
      )}

      {/* ===== PHASE: ERROR ===== */}
      {phase === 'error' && (
        <div className="mc-center">
          <div className="mc-error-icon">⚠️</div>
          <h2 className="mc-error-title">Có lỗi xảy ra</h2>
          <p className="mc-error-msg">{errorMsg}</p>
          <button className="mc-btn-retry" onClick={() => window.location.reload()}>
            🔄 Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
