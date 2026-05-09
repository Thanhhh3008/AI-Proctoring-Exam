import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class ProctoringService {
  constructor(private readonly prisma: PrismaService) {}

  async recordViolation(data: { sessionId: string; type: string; evidenceUrl?: string; metadata?: any }) {
    return this.prisma.violationLog.create({
      data: {
        sessionId: data.sessionId,
        type: data.type as any,
        evidenceUrl: data.evidenceUrl || null,
        metadata: data.metadata || null,
      },
    });
  }

  async getSessionViolations(sessionId: string) {
    return this.prisma.violationLog.findMany({ where: { sessionId }, orderBy: { timestamp: 'asc' } });
  }

  async saveReferencePhoto(sessionId: string, photoUrl: string) {
    return this.prisma.examSession.update({ where: { id: sessionId }, data: { referencePhoto: photoUrl } });
  }

  async getExamViolationStats(examId: string) {
    const sessions = await this.prisma.examSession.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        violationLogs: { orderBy: { timestamp: 'asc' } },
      },
    });
    return sessions.map(s => ({
      sessionId: s.id,
      student: s.student,
      status: s.status,
      startTime: s.startTime,
      submitTime: s.submitTime,
      referencePhoto: s.referencePhoto,
      totalViolations: s.violationLogs.length,
      violations: s.violationLogs,
      violationsByType: s.violationLogs.reduce((acc: any, v) => { acc[v.type] = (acc[v.type] || 0) + 1; return acc; }, {}),
    }));
  }

  async getExamViolationSummary(examId: string) {
    const stats = await this.getExamViolationStats(examId);
    
    const totalStudents = stats.length;
    const studentsWithViolations = stats.filter(s => s.totalViolations > 0).length;
    const totalViolations = stats.reduce((sum, s) => sum + s.totalViolations, 0);
    
    // Loại vi phạm phổ biến nhất
    const typeCounts: Record<string, number> = {};
    stats.forEach(s => {
      Object.entries(s.violationsByType).forEach(([type, count]) => {
        typeCounts[type] = (typeCounts[type] || 0) + (count as number);
      });
    });
    
    // Top 5 sinh viên vi phạm nhiều nhất
    const topViolators = [...stats]
      .filter(s => s.totalViolations > 0)
      .sort((a, b) => b.totalViolations - a.totalViolations)
      .slice(0, 5)
      .map(s => ({
        student: s.student,
        totalViolations: s.totalViolations,
        violationsByType: s.violationsByType,
      }));

    return {
      totalStudents,
      studentsWithViolations,
      totalViolations,
      violationsByType: typeCounts,
      topViolators,
    };
  }

  async getGlobalViolationStats() {
    const [totalViolations, activeSessions, totalStudentsToday] = await Promise.all([
      this.prisma.violationLog.count(),
      this.prisma.examSession.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.examSession.count({ 
        where: { 
          startTime: { gte: new Date(new Date().setHours(0,0,0,0)) } 
        } 
      }),
    ]);

    const violationsByTypeRaw = await this.prisma.violationLog.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    return {
      totalViolations,
      activeSessions,
      totalStudentsToday,
      violationsByType: violationsByTypeRaw.reduce((acc: any, v) => {
        acc[v.type] = v._count.id;
        return acc;
      }, {}),
    };
  }

  async getGlobalLiveFeed(limit = 30) {
    return this.prisma.violationLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        session: {
          include: {
            student: { select: { fullName: true, email: true, avatarUrl: true } },
            exam: { select: { title: true } },
          }
        }
      }
    });
  }

  async getActiveExams() {
    const exams = await this.prisma.exam.findMany({
      where: {
        examSessions: {
          some: { status: 'IN_PROGRESS' }
        }
      },
      include: {
        examSessions: {
          where: { status: 'IN_PROGRESS' },
          select: { id: true }
        }
      }
    });

    return exams.map(e => ({
      id: e.id,
      title: e.title,
      activeCount: e.examSessions.length,
    }));
  }
}

