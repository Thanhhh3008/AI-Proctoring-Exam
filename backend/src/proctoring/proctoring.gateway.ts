import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProctoringService } from './proctoring.service';
import { Logger } from '@nestjs/common';

// Map lưu socket.id → { sessionId, examId } của các điện thoại phụ
const mobileClients = new Map<string, { sessionId: string; examId: string; studentName: string }>();

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/proctoring' })
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('ProctoringGateway');

  constructor(private readonly proctoringService: ProctoringService) {}

  handleConnection(client: Socket) { this.logger.log(`Client kết nối: ${client.id}`); }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ngắt kết nối: ${client.id}`);
    // Nếu là điện thoại phụ → báo vi phạm MOBILE_DISCONNECTED
    const mobileInfo = mobileClients.get(client.id);
    if (mobileInfo) {
      const { sessionId, examId, studentName } = mobileInfo;
      mobileClients.delete(client.id);
      this.logger.warn(`📱 Điện thoại phụ ngắt kết nối - Session: ${sessionId}`);
      // Thông báo cho PC sinh viên
      this.server.to(`session-${sessionId}`).emit('mobile:disconnected', { sessionId });
      // Thông báo vi phạm cho giảng viên
      this.server.to(`exam-${examId}`).emit('violation:alert', {
        sessionId, studentName,
        type: 'MOBILE_DISCONNECTED',
        timestamp: new Date().toISOString(),
        metadata: { reason: 'Điện thoại phụ ngắt kết nối đột ngột' },
      });
    }
  }

  @SubscribeMessage('join:exam-room')
  handleJoinExamRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; examId: string; studentName: string }) {
    client.join(`session-${data.sessionId}`);
    client.join(`exam-${data.examId}`);
    this.server.to(`exam-${data.examId}`).emit('student:joined', { sessionId: data.sessionId, studentName: data.studentName, timestamp: new Date().toISOString() });
    this.logger.log(`SV "${data.studentName}" vào phòng thi ${data.examId}`);
    return { status: 'ok' };
  }

  @SubscribeMessage('join:teacher-monitor')
  handleTeacherJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { examId: string }) {
    client.join(`exam-${data.examId}`);
    this.logger.log(`Giảng viên vào giám sát kỳ thi ${data.examId}`);
    return { status: 'ok' };
  }

  // ============================================
  // 📱 MOBILE CAMERA - Điện thoại sinh viên join
  // ============================================
  @SubscribeMessage('mobile:join')
  handleMobileJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; examId: string; studentName: string },
  ) {
    const { sessionId, examId, studentName } = data;
    client.join(`session-${sessionId}`);
    client.join(`exam-${examId}`);
    // Lưu thông tin để xử lý khi disconnect
    mobileClients.set(client.id, { sessionId, examId, studentName });
    this.logger.log(`📱 Camera phụ kết nối - SV: "${studentName}" - Session: ${sessionId}`);
    // Thông báo cho PC sinh viên (cùng session room)
    this.server.to(`session-${sessionId}`).emit('mobile:connected', {
      sessionId,
      studentName,
      timestamp: new Date().toISOString(),
    });
    // Thông báo cho giảng viên
    this.server.to(`exam-${examId}`).emit('mobile:status', {
      sessionId, studentName, connected: true, timestamp: new Date().toISOString(),
    });
    return { status: 'ok' };
  }

  // ============================================
  // 📱 MOBILE CAMERA - Nhận frame từ điện thoại
  // ============================================
  @SubscribeMessage('mobile:frame')
  handleMobileFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; examId: string; frameData: string; timestamp: number },
  ) {
    const { sessionId, examId, frameData, timestamp } = data;
    // Forward frame đến PC sinh viên để chạy AI (YOLOv8)
    this.server.to(`session-${sessionId}`).emit('mobile:frame:received', {
      sessionId, frameData, timestamp,
    });
    // Forward frame đến giảng viên để xem live
    this.server.to(`exam-${examId}`).emit('mobile:frame:preview', {
      sessionId, frameData, timestamp,
    });
  }

  @SubscribeMessage('violation:report')
  async handleViolationReport(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; examId: string; type: string; evidenceUrl?: string; metadata?: any; studentName?: string }) {
    try {
      const violation = await this.proctoringService.recordViolation({ sessionId: data.sessionId, type: data.type, evidenceUrl: data.evidenceUrl, metadata: data.metadata });
      this.server.to(`exam-${data.examId}`).emit('violation:alert', {
        sessionId: data.sessionId, studentName: data.studentName || 'Không rõ',
        type: data.type, timestamp: violation.timestamp, evidenceUrl: data.evidenceUrl, metadata: data.metadata,
      });
      this.logger.warn(`⚠ VI PHẠM [${data.type}] - SV: ${data.studentName} - Session: ${data.sessionId}`);
      return { status: 'ok', violationId: violation.id };
    } catch (error) {
      this.logger.error('Lỗi ghi nhận vi phạm:', error);
      return { status: 'error', message: 'Không thể ghi nhận vi phạm' };
    }
  }

  @SubscribeMessage('proctor:save-reference')
  async handleSaveReference(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; photoUrl: string }) {
    try { await this.proctoringService.saveReferencePhoto(data.sessionId, data.photoUrl); return { status: 'ok' }; }
    catch { return { status: 'error' }; }
  }
}
