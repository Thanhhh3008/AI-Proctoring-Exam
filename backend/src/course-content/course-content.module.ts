import { Module } from '@nestjs/common';
import { CourseContentService } from './course-content.service';
import { CourseContentController } from './course-content.controller';

@Module({
  providers: [CourseContentService],
  controllers: [CourseContentController]
})
export class CourseContentModule {}
