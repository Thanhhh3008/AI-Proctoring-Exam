import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async getSummary() {
    const [totalStudents, totalTeachers, totalAIExams, totalViolations] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { role: UserRole.TEACHER } }),
      this.prisma.exam.count({ where: { requireCamera: true } }),
      this.prisma.violationLog.count(),
    ]);

    return {
      totalStudents,
      totalTeachers,
      totalAIExams,
      totalViolations,
    };
  }
}
