import { Controller, Get, Param, Query,Req } from '@nestjs/common';
import { ClassesService } from './classes.service';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt'; // <-- Thêm JwtService

@Controller('public-classes')
export class PublicClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private jwtService: JwtService // <-- Inject JwtService
  ) {}

  @Get('available')
  async getPublicAvailableClasses(@Req() req: Request) {
    let userId = null;
    
    // Thử bóc tách Token nếu có gửi lên (Dù route không bắt buộc có token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = this.jwtService.verify(token);
        userId = decoded.sub || decoded.id || decoded.userId;
      } catch (err) {
        // Token hết hạn hoặc sai thì cứ coi như khách (không làm gì)
      }
    }

    // Nếu bóc được userId -> Gọi hàm lọc của Sinh Viên. Nếu không -> Gọi hàm Public.
    if (userId) {
      return this.classesService.getAvailableClassesForStudent(userId);
    } else {
      return this.classesService.getPublicAvailableClasses();
    }
  }

  @Get(':id/detail')
  async getPublicClassDetail(@Param('id') classId: string) {
    return this.classesService.getClassDetail(classId);
  }
  @Get(':id/reviews')
  async getPublicClassReviews(@Param('id') classId: string) {
    // Truyền null vào studentId vì khách chưa đăng nhập
    return this.classesService.getClassReviews(classId, null);
  }

  @Get('search/suggestions')
  async searchClassSuggestions(@Query('q') query: string, @Req() req: Request) {
    if (!query || query.trim() === '') return [];
    
    let userId = null;
    
    // Bóc tách token để xem ai đang search
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = this.jwtService.decode(token);
        userId = decoded.sub || decoded.id || decoded.userId;
      } catch (err) {
        // Khách chưa đăng nhập
      }
    }
    
    // Truyền thêm userId xuống
    return this.classesService.searchPublicClasses(query, userId);
  }

  @Get('teacher/:id')
  async getTeacherProfile(@Param('id') teacherId: string) {
    return this.classesService.getTeacherProfile(teacherId);
  }
}