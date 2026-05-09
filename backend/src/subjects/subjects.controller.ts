import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll() {
    return this.subjectsService.getAllSubjects();
  }

  @Post('seed')
  seed() {
    return this.subjectsService.seedTenSubjects();
  }

  @Post()
  create(@Body() data: any) {
    return this.subjectsService.createSubject(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.subjectsService.updateSubject(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjectsService.deleteSubject(id);
  }
}