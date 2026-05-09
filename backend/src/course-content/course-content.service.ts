import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service'; // Đảm bảo đường dẫn này đúng với dự án của bạn

@Injectable()
export class CourseContentService {
  constructor(private prisma: PrismaService) {}

  // 1. API LẤY NỘI DUNG KHÓA HỌC (Dành cho Sinh viên & Giảng viên)
  async getCourseContent(classId: string) {
    // Kéo toàn bộ Chủ đề (Section) và Hoạt động (Activity) bên trong nó
    return this.prisma.courseSection.findMany({
      where: { classId: classId },
      orderBy: { order: 'asc' }, // Sắp xếp theo thứ tự chương
      include: {
        activities: {
          orderBy: { createdAt: 'asc' }, // Sắp xếp bài tập theo thời gian tạo
        },
      },
    });
  }

  // 2. HÀM TẠO DỮ LIỆU MẪU (Dùng để test giao diện)
  // async seedCourseContent(classId: string) {
  //   // Xóa dữ liệu cũ của lớp này (nếu có) để test không bị trùng
  //   await this.prisma.courseSection.deleteMany({ where: { classId } });

  //   // Tạo Chủ đề 1: Có chứa URL và FILE
  //   const section1 = await this.prisma.courseSection.create({
  //     data: {
  //       classId,
  //       title: 'Chương 1: Giới thiệu chung',
  //       order: 1,
  //       activities: {
  //         create: [
  //           { type: 'URL', title: 'Nhóm liên lạc Zalo Lớp', fileUrl: 'https://zalo.me/g/abcd' },
  //           { type: 'FILE', title: 'Đề cương chi tiết học phần (PDF)', fileUrl: 'https://example.com/de-cuong.pdf' }
  //         ]
  //       }
  //     }
  //   });

  //   // Tạo Chủ đề 2: Có chứa BÀI TẬP và TRẮC NGHIỆM
  //   const section2 = await this.prisma.courseSection.create({
  //     data: {
  //       classId,
  //       title: 'Kiểm tra giua ki',
  //       order: 2,
  //       activities: {
  //         create: [
  //           { 
  //             type: 'ASSIGNMENT', 
  //             title: 'Thường kỳ 1 - Nộp bài báo cáo', 
  //             dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // Hạn nộp là 7 ngày sau
  //           },
  //           { 
  //             type: 'QUIZ', 
  //             title: 'Kiểm tra Giữa kỳ (50%) - Bắt buộc',
  //           }
  //         ]
  //       }
  //     }
  //   });

  //   return { 
  //     message: 'Tạo dữ liệu chương mục và bài tập THÀNH CÔNG!', 
  //     data: [section1, section2] 
  //   };
  // }

  
  // 3. API Lấy chi tiết 1 Hoạt động (Dành cho trang ActivityDetailPage)
  async getActivityById(activityId: string) {
    const activity = await this.prisma.courseActivity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new Error('Không tìm thấy hoạt động này!');
    return activity;
  }

  // 4. API DÀNH CHO GIẢNG VIÊN: Tạo Chương/Chủ đề mới
  async createSection(data: { classId: string; title: string; order: number }) {
    return this.prisma.courseSection.create({ data });
  }

  // 5. API DÀNH CHO GIẢNG VIÊN: Tạo Bài tập/Tài liệu mới
  async createActivity(data: {
    sectionId: string;
    type: any; // ActivityType
    title: string;
    description?: string;
    fileUrl?: string;
    dueDate?: Date;
  }) {
    return this.prisma.courseActivity.create({ data });
  }
}