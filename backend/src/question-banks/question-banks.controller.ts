import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 
@Controller()
@UseGuards(JwtAuthGuard) // 
export class QuestionBanksController {
  constructor(private readonly questionBanksService: QuestionBanksService) {}

  // ==========================================
  // API CHO NGÂN HÀNG
  // ==========================================

  // Lấy danh sách Ngân hàng của 1 Lớp
  @Get('classes/:classId/question-banks')
  getBanksByClassId(@Param('classId') classId: string) {
    return this.questionBanksService.getBanksByClassId(classId);
  }

  @Post('classes/:classId/question-banks')
  createBank(
    @Param('classId') classId: string, 
    @Body() body: { name: string },
    @Request() req: any 
  ) {
    
    const teacherId = req.user.id || req.user.userId;
    
    return this.questionBanksService.createBank(classId, body.name, teacherId);
  }

  @Delete('question-banks/:bankId')
  deleteBank(@Param('bankId') bankId: string) {
    return this.questionBanksService.deleteBank(bankId);
  }
  // ==========================================
  // API CHO CÂU HỎI BÊN TRONG NGÂN HÀNG
  // ==========================================

  // Lấy toàn bộ Câu hỏi của 1 Ngân hàng
  @Get('question-banks/:bankId')
  getBankWithQuestions(@Param('bankId') bankId: string) {
    return this.questionBanksService.getBankWithQuestions(bankId);
  }

  // Tạo Câu hỏi mới
  @Post('question-banks/:bankId/questions')
  createQuestion(@Param('bankId') bankId: string, @Body() body: any) {
    return this.questionBanksService.createQuestion(bankId, body);
  }

  // Cập nhật Câu hỏi
  @Put('questions/:questionId')
  updateQuestion(@Param('questionId') questionId: string, @Body() body: any) {
    return this.questionBanksService.updateQuestion(questionId, body);
  }

  // Xóa Câu hỏi
  @Delete('questions/:questionId')
  deleteQuestion(@Param('questionId') questionId: string) {
    return this.questionBanksService.deleteQuestion(questionId);
  }
}