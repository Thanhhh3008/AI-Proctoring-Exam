import { io, Socket } from 'socket.io-client';
import type { ViolationEvent } from './types';

const SOCKET_URL = 'http://127.0.0.1:3000/proctoring';

export class WebSocketClient {
  private socket: Socket | null = null;
  private sessionId = '';
  private examId = '';
  private studentName = '';

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
