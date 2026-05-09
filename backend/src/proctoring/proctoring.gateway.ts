import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProctoringService } from './proctoring.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/proctoring' })
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('ProctoringGateway');

  constructor(private readonly proctoringService: ProctoringService) {}

  handleConnection(client: Socket) { this.logger.log(`Client kết nối: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Client ngắt kết nối: ${client.id}`); }

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
