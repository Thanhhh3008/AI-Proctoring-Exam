import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('proctoring')
export class ProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}



  /**
   * Upload bằng chứng vi phạm (ảnh base64 từ webcam)
   * POST /proctoring/upload-evidence
   * Body: { imageData: "data:image/jpeg;base64,..." }
   */
  @Post('upload-evidence')
  @HttpCode(HttpStatus.CREATED)
  async uploadEvidence(@Body() body: { imageData: string }) {
    const { imageData } = body;
    if (!imageData || !imageData.startsWith('data:image')) {
      return { success: false, message: 'Dữ liệu ảnh không hợp lệ' };
    }

    // Tách phần base64 thực sự
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Đảm bảo thư mục tồn tại
    const dir = path.join(process.cwd(), 'uploads', 'violations');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Tên file duy nhất theo timestamp
    const filename = `violation_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    return {
      success: true,
      url: `/uploads/violations/${filename}`,
    };
  }

  /**
   * Lấy thống kê vi phạm của toàn bộ kỳ thi (cho giảng viên)
   * GET /proctoring/exam/:examId/stats
   */
  @Get('exam/:examId/stats')
  async getExamViolationStats(@Param('examId') examId: string) {
    return this.proctoringService.getExamViolationStats(examId);
  }

  /**
   * Lấy danh sách vi phạm chi tiết của 1 session
   * GET /proctoring/session/:sessionId/violations
   */
  @Get('session/:sessionId/violations')
  async getSessionViolations(@Param('sessionId') sessionId: string) {
    return this.proctoringService.getSessionViolations(sessionId);
  }

  /**
   * Lấy tóm tắt nhanh (tổng vi phạm, SV vi phạm nhiều nhất, loại vi phạm phổ biến)
   * GET /proctoring/exam/:examId/summary
   */
  @Get('exam/:examId/summary')
  async getExamViolationSummary(@Param('examId') examId: string) {
    return this.proctoringService.getExamViolationSummary(examId);
  }
}
