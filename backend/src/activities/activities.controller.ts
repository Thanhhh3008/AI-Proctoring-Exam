import { 
  Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, 
  UseInterceptors, UploadedFile, Request, BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, parse } from 'path';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 
import * as fs from 'fs';

// Đảm bảo thư mục lưu bài nộp tồn tại
const submissionDir = './uploads/submissions';
if (!fs.existsSync(submissionDir)) {
  fs.mkdirSync(submissionDir, { recursive: true });
}

@Controller('activities')
@UseGuards(JwtAuthGuard) 
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

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
    storage: diskStorage({
      destination: submissionDir, // Thư mục lưu file trên server
      filename: (req, file, cb) => {
        // 1. Tách tên gốc và phần mở rộng
        const fileInfo = parse(file.originalname);
        const originalName = fileInfo.name;

        // 2. Làm sạch tên file (Bỏ khoảng trắng, ký tự có dấu, ký tự đặc biệt)
        let sanitizedName = originalName
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
          .replace(/\s+/g, '_') 
          .replace(/[^a-zA-Z0-9_\-]/g, ''); 

        // 3. Tạo 4 số ngẫu nhiên từ 1000 đến 9999
        const randomNum = Math.floor(1000 + Math.random() * 9000);

        // 4. Lấy phần mở rộng
        const fileExtName = extname(file.originalname);

        // 5. Kết hợp: tenfilegoc_1234.pdf
        const finalFileName = `${sanitizedName}_${randomNum}${fileExtName}`;
        
        cb(null, finalFileName);
      }
    })
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
    const fileUrl = `/uploads/submissions/${file.filename}`;

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