// Thêm Body vào danh sách import
import { Controller, Get, Post, Param, UseGuards, Body } from '@nestjs/common';
import { CourseContentService } from './course-content.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 

@Controller('course-content')
@UseGuards(JwtAuthGuard) 
export class CourseContentController {
  constructor(private readonly courseContentService: CourseContentService) {}

  @Get('class/:classId')
  getCourseContent(@Param('classId') classId: string) {
    return this.courseContentService.getCourseContent(classId);
  }

  // @Post('seed/:classId')
  // seedCourseContent(@Param('classId') classId: string) {
  //   return this.courseContentService.seedCourseContent(classId);
  // }

  @Get('activity/:activityId')
  getActivityById(@Param('activityId') activityId: string) {
    return this.courseContentService.getActivityById(activityId);
  }

  @Post('section')
  createSection(@Body() body: { classId: string; title: string; order: number }) {
    return this.courseContentService.createSection(body);
  }

  @Post('activity')
  createActivity(@Body() body: any) {
    if (body.dueDate) body.dueDate = new Date(body.dueDate);
    return this.courseContentService.createActivity(body);
  }
}