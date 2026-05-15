import { Controller, Get, Put, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 

@UseGuards(JwtAuthGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // =======================================================
  // 1. DÀNH CHO GIẢNG VIÊN (QUẢN LÝ KỲ THI)
  // =======================================================

  // Lấy dữ liệu chi tiết của 1 bài thi để hiển thị lên form cài đặt
  @Get(':id')
  getExamById(@Param('id') id: string, @Req() req) { 
    
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    return this.examsService.getExamById(id, userId);
  }

  // Cập nhật các thông số (Thời gian, Strict Mode, Camera, Luật sinh đề tự động...)
  @Put(':id')
  updateExam(@Param('id') id: string, @Body() data: any) {
    return this.examsService.updateExam(id, data);
  }

  // =======================================================
  // 2. DÀNH CHO GIẢNG VIÊN (CHẤM ĐIỂM TỰ LUẬN)
  // =======================================================

  // Lấy danh sách phiên thi của kỳ thi (để GV chấm điểm)
  @Get(':id/sessions')
  getExamSessions(@Param('id') examId: string) {
    return this.examsService.getExamSessions(examId);
  }

  // Xem chi tiết bài thi của 1 sinh viên
  @Get('sessions/:sessionId/detail')
  getSessionDetail(@Param('sessionId') sessionId: string) {
    return this.examsService.getSessionDetail(sessionId);
  }

  // Chấm điểm 1 câu tự luận
  @Patch('sessions/answers/:answerId/grade')
  gradeEssayAnswer(
    @Param('answerId') answerId: string,
    @Body() body: { score: number; feedback?: string }
  ) {
    return this.examsService.gradeEssayAnswer(answerId, body.score, body.feedback);
  }

  // Điều chỉnh tổng điểm và thêm nhận xét cho phiên thi
  @Patch('sessions/:sessionId/adjust-grade')
  adjustSessionGrade(
    @Param('sessionId') sessionId: string,
    @Body() body: { score: number; comment: string }
  ) {
    return this.examsService.adjustSessionGrade(sessionId, body.score, body.comment);
  }

  // =======================================================
  // 3. DÀNH CHO SINH VIÊN (LÀM BÀI THI)
  // =======================================================

  // Bắt đầu thi (Hệ thống kiểm tra Session và Bốc đề ngẫu nhiên)
  @Post(':id/start')
  startExam(@Param('id') id: string, @Req() req) {
    // Trích xuất ID sinh viên từ JWT Token một cách bảo mật
    const studentId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.examsService.startExamSession(id, studentId);
  }

  // API Auto-save: Lưu nháp từng câu trả lời khi sinh viên click chọn đáp án
  @Post('sessions/:sessionId/update-answer')
  updateDraftAnswer(
    @Param('sessionId') sessionId: string, 
    @Body() body: { questionId: string; answer: string | null }
  ) {
    return this.examsService.updateDraftAnswer(sessionId, body.questionId, body.answer);
  }

  // Nộp bài thi chính thức và chấm điểm
  @Post(':id/submit')
  submitExam(@Param('id') id: string, @Body() payload: any, @Req() req) {
    // Trích xuất ID sinh viên từ JWT Token
    const studentId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.examsService.submitExam(id, studentId, payload);
  }
}