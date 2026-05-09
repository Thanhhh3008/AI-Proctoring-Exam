import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  // Lấy danh sách tất cả môn học (để đổ vào dropdown khi tạo lớp)
  async getAllSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubject(data: { name: string; subjectCode: string; description?: string }) {
    return this.prisma.subject.create({
      data,
    });
  }

  async updateSubject(id: string, data: { name: string; subjectCode: string; description?: string }) {
    return this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async deleteSubject(id: string) {
    return this.prisma.subject.delete({
      where: { id },
    });
  }

  // Logic Seed 10 môn học chuyển về đây
  async seedTenSubjects() {
    const subjectsData = [
      { code: 'INT1001', name: 'Nhập môn Lập trình' },
      { code: 'INT1002', name: 'Cấu trúc dữ liệu và Giải thuật' },
      { code: 'INT1003', name: 'Cơ sở dữ liệu' },
      { code: 'INT1004', name: 'Mạng máy tính' },
      { code: 'INT1005', name: 'Hệ điều hành' },
      { code: 'INT1006', name: 'Phân tích thiết kế HT' },
      { code: 'INT1007', name: 'Trí tuệ nhân tạo' },
      { code: 'INT1008', name: 'Lập trình hướng đối tượng' },
      { code: 'INT1009', name: 'Kiểm thử phần mềm' },
      { code: 'INT1010', name: 'An toàn thông tin' },
    ];

    await Promise.all(
      subjectsData.map((s) =>
        this.prisma.subject.upsert({
          where: { subjectCode: s.code },
          update: {},
          create: { subjectCode: s.code, name: s.name },
        }),
      )
    );
    return { message: 'Đã khởi tạo 10 môn học!' };
  }
}