import { Controller, Get, Post, Put, Delete, Patch, Req,UseGuards, Request, Param,NotFoundException,ForbiddenException, Query, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

// Hàm hỗ trợ tạo thư mục nếu chưa tồn tại
const ensureExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

@Controller('classes')
@UseGuards(JwtAuthGuard) 
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('my-classes')
  async getMyClasses(@Request() req) {
    const userId = req.user.id || req.user.userId || req.user.sub; 
    const role = req.user.role; 

    if (role === 'TEACHER') {
      return this.classesService.getClassesByTeacher(userId);
    }
    return this.classesService.getClassesByStudent(userId);
  }

@UseGuards(JwtAuthGuard) 
  @Get(':id/detail')
  async getClassDetailForTeacher(@Param('id') classId: string, @Req() req) {
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    
    const classInfo = await this.classesService.getClassDetail(classId);

 
    if (userRole !== 'ADMIN' && (userRole === 'STUDENT' || classInfo.course.teacherId !== userId)) {
      throw new ForbiddenException('Chỉ có giảng viên phụ trách mới có quyền quản lý lớp học này.');
    }


    return classInfo;
  }
  @Get(':id/studentclass')
  async getClassDetailForStudent(@Param('id') id: string) {
    return this.classesService.getClassDetail(id);
  }


  @Post(':id/sections')
  async createSection(@Param('id') classId: string, @Body() data: { title: string }) {
    return this.classesService.createSection(classId, data.title);
  }

  // Trong hàm createClass:
  @Post()
  async createClass(
    @Request() req,
    @Body() body: { subjectIdOrName: string; classCode: string; maxStudents: number; price: number } 
  ) {
    const teacherId = req.user.id || req.user.userId;
    const parsedMax = parseInt(body.maxStudents as any, 10);
    
    // SỬA TẠI ĐÂY: Dùng parseFloat thay vì parseInt
    const parsedPrice = parseFloat(body.price as any); 
    
    return this.classesService.createClass({
      subjectIdOrName: body.subjectIdOrName, 
      teacherId: teacherId,
      classCode: body.classCode,
      maxStudents: isNaN(parsedMax) ? 50 : parsedMax,
      price: isNaN(parsedPrice) ? 0 : parsedPrice, 
    });
  }

  @Patch(':id/complete')
  async markClassAsCompleted(@Param('id') id: string, @Request() req) {
    const teacherId = req.user.id || req.user.userId;
    return this.classesService.markClassAsCompleted(id, teacherId);
  }

  @Patch(':id/reopen')
  async reopenClass(@Param('id') id: string, @Request() req) {
    const teacherId = req.user.id || req.user.userId;
    return this.classesService.reopenClass(id, teacherId); 
  }

  @Get('available')
  async getAvailableClasses(@Request() req) {
    const studentId = req.user.id || req.user.userId || req.user.sub;
    return this.classesService.getAvailableClassesForStudent(studentId);
  }

  @Post(':id/join')
  async joinClass(@Param('id') classId: string, @Request() req) {
    const studentId = req.user.id || req.user.userId || req.user.sub;
    return this.classesService.joinClass(classId, studentId);
  }

  @Get(':id/members')
  async getClassMembers(@Param('id') classId: string) {
    return this.classesService.getClassMembers(classId);
  }

  @Get(':id/my-grades')
  async getMyGrades(@Param('id') classId: string, @Request() req) {
    const studentId = req.user.id || req.user.userId || req.user.sub;
    return this.classesService.getStudentGradesInClass(classId, studentId);
  }

  @Get(':id/reviews')
  async getClassReviews(@Param('id') classId: string, @Request() req) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.classesService.getClassReviews(classId, userId);
  }

  @Post(':id/reviews')
  async submitReview(
    @Param('id') classId: string, 
    @Request() req,
    @Body() body: { rating: number, comment: string }
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.classesService.submitReview(classId, userId, body.rating, body.comment);
  }

  // --- QUẢN LÝ CHỦ ĐỀ (SECTION) ---

  @Put(':id/sections/:sectionId')
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() body: { title: string },
  ) {
    return this.classesService.updateSection(sectionId, body.title);
  }

  @Delete(':id/sections/:sectionId')
  async deleteSection(@Param('sectionId') sectionId: string) {
    return this.classesService.deleteSection(sectionId);
  }

  // --- QUẢN LÝ THÀNH VIÊN ---

  @Get(':id/members-paged')
  async getMembersPaged(
    @Param('id') classId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.classesService.getMembersPaged(classId, +page, +limit);
  }

  @Delete(':id/members/:studentId')
  async removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.removeStudentFromClass(classId, studentId);
  }

  // --- QUẢN LÝ BẢNG ĐIỂM TỔNG HỢP ---

  @Get(':id/gradebook')
  async getGradebook(
    @Param('id') classId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.classesService.getGradebook(classId, +page, +limit);
  }

  // API CẬP NHẬT CÀI ĐẶT LỚP & UPLOAD ẢNH
  @Put(':id/settings')
  @UseInterceptors(FileInterceptor('coverImage', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './uploads/courses';
        ensureExists(uploadPath);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `cover-${uniqueSuffix}${ext}`);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Chỉ chấp nhận file ảnh JPG, JPEG hoặc PNG!'), false);
      }
      cb(null, true);
    }
  }))
  async updateClassSettings(
    @Param('id') classId: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.classesService.updateClassSettings(classId, body, file);
  }

  // --- LẤY BÀI TẬP CHỜ CHẤM ĐIỂM ---
  @Get('all-reviews')
  async getAllReviews(@Request() req) {
    const teacherId = req.user.id || req.user.userId;
    return this.classesService.getAllTeacherReviews(teacherId);
  }

  @Get(':id/pending-submissions')
  async getPendingSubmissions(@Param('id') classId: string) {
    return this.classesService.getPendingSubmissions(classId);
  }

  
}