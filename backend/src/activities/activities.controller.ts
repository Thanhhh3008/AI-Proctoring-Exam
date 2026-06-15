import { 
  Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, 
  UseInterceptors, UploadedFile, Request, BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../upload/cloudinary.service';

@Controller('activities')
@UseGuards(JwtAuthGuard) 
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Get(':id')
  async getActivityDetail(@Param('id') id: string) {
    return this.activitiesService.getActivityDetail(id);
  }

  // API Đã được sửa lỗi: Import @Delete
  @Delete(':id/my-submission')
  async deleteMySubmission(@Param('id') activityId: string, @Request() req) {
    const studentId = req.user.id || req.user.userId || req.user.sub;
    await this.activitiesService.deleteSubmission(activityId, studentId);
    return { message: 'Đã gỡ bài nộp' };
  }

  @Post()
  async createActivity(@Body() body: any) {
    return this.activitiesService.createActivity(body);
  }

  @Put(':id')
  async updateActivity(@Param('id') id: string, @Body() data: any) {
    return this.activitiesService.updateActivity(id, data);
  }

  // =========================================================
  // API SINH VIÊN: LẤY BÀI NỘP CỦA CHÍNH MÌNH
  // =========================================================
  @Get(':id/my-submission')
  async getMySubmission(@Param('id') activityId: string, @Request() req) {
    // Lấy studentId từ token JWT
    const studentId = req.user.id || req.user.userId || req.user.sub;
    return this.activitiesService.getMySubmission(activityId, studentId);
  }

  // =========================================================
  // API SINH VIÊN: NỘP BÀI (UPLOAD FILE)
  // Áp dụng logic giữ nguyên tên gốc + thêm số ngẫu nhiên
  // =========================================================
  @Post(':id/submit')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // Giới hạn 20MB
  }))
  async submitAssignment(
    @Param('id') activityId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để nộp!');
    }

    const studentId = req.user.id || req.user.userId || req.user.sub;
    
    // Upload thẳng file nộp bài (PDF, Docx, Zip...) lên Cloudinary
    const fileUrl = await this.cloudinaryService.uploadBuffer(file.buffer, 'submissions');

    // Gọi Service để lưu thông tin vào DB
    return this.activitiesService.submitAssignment(activityId, studentId, fileUrl);
  }

  // =========================================================
  // API GIẢNG VIÊN: LẤY DANH SÁCH BÀI NỘP ĐỂ CHẤM
  // =========================================================
  @Get(':id/submissions')
  async getSubmissions(@Param('id') id: string) {
    return this.activitiesService.getSubmissions(id);
  }

  // =========================================================
  // API GIẢNG VIÊN: CHẤM ĐIỂM BÀI NỘP
  // =========================================================
  @Patch('submissions/:submissionId/grade')
  async gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() body: { score: number, feedback: string }
  ) {
    return this.activitiesService.gradeSubmission(submissionId, body.score, body.feedback);
  }
  @Post(':id/bulk-zero')
  async bulkGradeZero(@Param('id') activityId: string) {
    return this.activitiesService.bulkGradeZero(activityId);
  }
  @Delete(':id')
  async deleteActivity(@Param('id') activityId: string) {
    return this.activitiesService.deleteActivity(activityId);
  }
}