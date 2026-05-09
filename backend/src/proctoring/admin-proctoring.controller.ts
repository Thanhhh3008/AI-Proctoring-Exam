import { Controller, Get } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import * as path from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@Controller('admin-proctoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProctoringController {
  constructor(private readonly proctoringService: ProctoringService) {}

  @Get('global-stats')
  async getGlobalStats() {
    return this.proctoringService.getGlobalViolationStats();
  }

  @Get('live-feed')
  async getLiveFeed() {
    return this.proctoringService.getGlobalLiveFeed();
  }

  @Get('active-exams')
  async getActiveExams() {
    return this.proctoringService.getActiveExams();
  }
}
