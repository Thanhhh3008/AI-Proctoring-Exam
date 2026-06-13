import { io, Socket } from 'socket.io-client';
import type { ViolationEvent } from './types';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/proctoring';

export class WebSocketClient {
  private socket: Socket | null = null;
  private sessionId = '';
  private examId = '';
  private studentName = '';

  // Callbacks cho mobile camera events
  onMobileConnected?: (data: { sessionId: string; studentName: string }) => void;
  onMobileDisconnected?: (data: { sessionId: string }) => void;
  onMobileFrame?: (frameData: string, timestamp: number) => void;

  connect(sessionId: string, examId: string, studentName: string) {
    this.sessionId = sessionId;
    this.examId = examId;
    this.studentName = studentName;

    this.socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], autoConnect: true });

    this.socket.on('connect', () => {
      console.log('[WS] Đã kết nối WebSocket proctoring');
      this.socket?.emit('join:exam-room', { sessionId, examId, studentName });
    });

    this.socket.on('disconnect', () => console.log('[WS] Mất kết nối'));
    this.socket.on('connect_error', (err) => console.warn('[WS] Lỗi:', err.message));

    // ============================================
    // 📱 LẮNG NGHE SỰ KIỆN TỪ CAMERA PHỤ
    // ============================================

    // Điện thoại đã kết nối thành công
    this.socket.on('mobile:connected', (data: { sessionId: string; studentName: string }) => {
      console.log('[WS] 📱 Camera phụ đã kết nối:', data.studentName);
      this.onMobileConnected?.(data);
    });

    // Điện thoại ngắt kết nối
    this.socket.on('mobile:disconnected', (data: { sessionId: string }) => {
      console.warn('[WS] 📱 Camera phụ ngắt kết nối - Session:', data.sessionId);
      this.onMobileDisconnected?.(data);
    });

    // Nhận frame từ điện thoại (để PC chạy AI)
    this.socket.on('mobile:frame:received', (data: { sessionId: string; frameData: string; timestamp: number }) => {
      if (data.sessionId === this.sessionId) {
        this.onMobileFrame?.(data.frameData, data.timestamp);
      }
    });
  }

  reportViolation(violation: ViolationEvent) {
    if (!this.socket?.connected) return;
    this.socket.emit('violation:report', {
      sessionId: this.sessionId, examId: this.examId,
      studentName: this.studentName, type: violation.type,
      evidenceUrl: violation.evidenceUrl, metadata: violation.metadata,
    });
  }

  saveReferencePhoto(photoUrl: string) {
    this.socket?.emit('proctor:save-reference', { sessionId: this.sessionId, photoUrl });
  }

  disconnect() { this.socket?.disconnect(); this.socket = null; }
}
