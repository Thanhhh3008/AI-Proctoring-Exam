import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service'; // Đảm bảo đường dẫn này đúng

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // 1. LẤY CHI TIẾT HOẠT ĐỘNG
  async getActivityDetail(activityId: string, userRole?: string) {
    const activity = await this.prisma.courseActivity.findUnique({
      where: { id: activityId },
      include: {
        section: {
          include: { class: { include: { subject: true } } }
        }
      }
    });

    if (!activity) throw new NotFoundException('Không tìm thấy hoạt động!');

    // TÍNH NĂNG MỚI: Chặn sinh viên xem nếu bài đang bị ẩn
    // Nếu truyền userRole là 'STUDENT' và bài bị ẩn thì báo lỗi
    if (activity.isHidden && userRole === 'STUDENT') {
      throw new BadRequestException('Hoạt động này đang được tạm ẩn bởi Giảng viên!');
    }

    return activity;
  }

  // =========================================================
  // LOGIC SINH VIÊN: KIỂM TRA ĐÃ NỘP BÀI CHƯA
  // =========================================================
  async getMySubmission(activityId: string, studentId: string) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: {
        activityId_studentId: { activityId, studentId }
      }
    });

    // Nếu chưa có bài nộp, quăng lỗi 404 để Frontend biết đường hiển thị "Chưa nộp bài"
    if (!submission) {
      throw new NotFoundException('Chưa nộp bài');
    }

    return submission;
  }


  async submitAssignment(activityId: string, studentId: string, fileUrl: string) {
    const activity = await this.prisma.courseActivity.findUnique({
      where: { id: activityId }
    });

    if (!activity || activity.type !== 'ASSIGNMENT') {
      throw new BadRequestException('Hoạt động này không cho phép nộp bài!');
    }

    // 1. Kiểm tra Giảng viên có đang khóa thủ công không?
    if (activity.isLocked) {
      throw new BadRequestException('Hoạt động này đang bị Giảng viên khóa!');
    }

    // 2. Kiểm tra tùy chọn chặn nộp trễ của Giảng viên
    if (activity.lockAfterDueDate && activity.dueDate) {
      const now = new Date();
      if (now > new Date(activity.dueDate)) {
        throw new BadRequestException('Đã hết hạn và Giảng viên không cho phép nộp trễ!');
      }
    }

    // 3. Dùng upsert: Nếu chưa có thì TẠO MỚI, nếu có rồi thì CẬP NHẬT đè file mới lên
    const submission = await this.prisma.assignmentSubmission.upsert({
      where: {
        activityId_studentId: { activityId, studentId }
      },
      update: {
        fileUrl,
        submittedAt: new Date(),
        // Khi sinh viên nộp lại file mới, ta sẽ reset điểm và feedback cũ đi để GV chấm lại từ đầu
        score: null,
        feedback: null
      },
      create: {
        activityId,
        studentId,
        fileUrl
      }
    });

    return submission;
  }

  // 2. LẤY DANH SÁCH BÀI NỘP CỦA TOÀN BỘ SINH VIÊN (Dành cho Giảng viên chấm điểm)
  async getSubmissions(activityId: string) {
    // Tìm thông tin lớp của hoạt động này trước
    const activity = await this.prisma.courseActivity.findUnique({
      where: { id: activityId },
      include: { section: { select: { classId: true } } }
    });

    if (!activity) throw new NotFoundException('Hoạt động không tồn tại');

    // Lấy danh sách toàn bộ sinh viên trong lớp đó
    const studentsInClass = await this.prisma.classStudent.findMany({
      where: { classId: activity.section.classId },
      include: {
        student: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    // Lấy danh sách các bài ĐÃ nộp cho hoạt động này
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { activityId }
    });

    // Gộp dữ liệu: SV nào chưa nộp thì phần submission sẽ là null
    return studentsInClass.map(cs => {
      const submission = submissions.find(s => s.studentId === cs.studentId);
      return {
        student: cs.student,
        submission: submission || null
      };
    });
  }

  // 3. CHẤM ĐIỂM BÀI NỘP
  async gradeSubmission(submissionId: string, score: number, feedback: string) {
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: score,
        feedback: feedback
      }
    });
  }

  async deleteSubmission(activityId: string, studentId: string) {
    return this.prisma.assignmentSubmission.delete({
      where: { activityId_studentId: { activityId, studentId } }
    });
  }

  // ==============================================
  // 4. TẠO HOẠT ĐỘNG MỚI
  // ==============================================
  async createActivity(data: any) {
    const sectionId = data.sectionId;

    // Tìm chương học và lớp học để tự động lấy classId và teacherId
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { class: true } 
    });

    if (!section) {
      throw new BadRequestException('Không tìm thấy chương học (section)!');
    }

    return this.prisma.$transaction(async (tx) => {
      let createdExamId: string | null = null;

      // NẾU LÀ EXAM: Tạo bảng Exam thật trước
      if (data.type === 'EXAM') {
        const newExam = await tx.exam.create({
          data: {
            title: data.title || 'Kỳ thi mới',
            classId: section.classId, 
            teacherId: section.class.teacherId, // Tự động lấy ID giảng viên từ lớp học
            status: 'UPCOMING', 
            startTime: new Date(), 
            endTime: new Date(new Date().getTime() + 60 * 60 * 1000), 
            durationMinutes: 60,
            strictMode: true,
            requireCamera: true
          }
        });
        createdExamId = newExam.id; 
      }

      // TẠO HOẠT ĐỘNG CHUNG CHO TẤT CẢ
      const newActivity = await tx.courseActivity.create({
        data: {
          sectionId: sectionId,
          type: data.type, 
          title: data.title,
          description: data.description,
          fileUrl: data.fileUrl,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          isHidden: true, 
          examId: createdExamId 
        }
      });

      return newActivity;
    });
  }

  // 5. CẬP NHẬT HOẠT ĐỘNG 
  async updateActivity(activityId: string, data: any) {
    return this.prisma.courseActivity.update({
      where: { id: activityId },
      data: {
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isHidden: data.isHidden,
        isLocked: data.isLocked,
        lockAfterDueDate: data.lockAfterDueDate, 
      }
    });
  }

  async bulkGradeZero(activityId: string) {
    // Lấy thông tin lớp học từ activity
    const activity = await this.prisma.courseActivity.findUnique({
      where: { id: activityId },
      include: { section: { select: { classId: true } } }
    });

    if (!activity) throw new NotFoundException('Không tìm thấy hoạt động');

    // Tìm tất cả sinh viên trong lớp
    const classStudents = await this.prisma.classStudent.findMany({
      where: { classId: activity.section.classId }
    });

    // Tìm những sinh viên đã nộp bài
    const existingSubmissions = await this.prisma.assignmentSubmission.findMany({
      where: { activityId }
    });
    const submittedStudentIds = existingSubmissions.map(sub => sub.studentId);

    // Lọc ra danh sách sinh viên CHƯA nộp bài
    const unsubmittedStudents = classStudents.filter(
      cs => !submittedStudentIds.includes(cs.studentId)
    );

    if (unsubmittedStudents.length === 0) {
      return { message: 'Tất cả sinh viên đã nộp bài' };
    }

    // Tạo dữ liệu bài nộp điểm 0 cho những người chưa nộp
    const zeroSubmissions = unsubmittedStudents.map(student => ({
      activityId: activityId,
      studentId: student.studentId,
      fileUrl: '', // Bỏ trống file vì không nộp
      score: 0,
      feedback: 'Không nộp bài',
    }));

    // Insert hàng loạt vào database
    await this.prisma.assignmentSubmission.createMany({
      data: zeroSubmissions
    });

    return { message: `Đã chấm 0 điểm cho ${zeroSubmissions.length} sinh viên` };
  }

  // ==============================================
  // XÓA HOẠT ĐỘNG & TOÀN BỘ DỮ LIỆU LIÊN QUAN
  // ==============================================
  async deleteActivity(activityId: string) {
    // Kiểm tra hoạt động có tồn tại không
    const activity = await this.prisma.courseActivity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      throw new NotFoundException('Không tìm thấy hoạt động cần xóa!');
    }

    // 1. Xóa toàn bộ bài nộp và điểm số (nếu là ASSIGNMENT)
    if (activity.type === 'ASSIGNMENT') {
      await this.prisma.assignmentSubmission.deleteMany({
        where: { activityId: activityId }
      });
    }

    // 2. Xóa Bài Thi thật trong bảng Exam (nếu là EXAM)
    if (activity.type === 'EXAM' && activity.examId) {
      
      await this.prisma.exam.delete({
        where: { id: activity.examId }
      });
    }

    // Cuối cùng xóa Activity
    await this.prisma.courseActivity.delete({
      where: { id: activityId }
    });

    return { message: 'Đã xóa hoạt động và toàn bộ dữ liệu liên quan thành công!' };
  }
}