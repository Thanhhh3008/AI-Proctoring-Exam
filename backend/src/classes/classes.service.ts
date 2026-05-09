import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { MailService } from '../shared/mail/mail.service';

@Injectable()
export class ClassesService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  // ==========================================
  // 1. TẠO LỚP HỌC MỚI (Đã thêm Price)
  // ==========================================
  async createClass(data: { 
    subjectIdOrName: string; 
    teacherId: string; 
    classCode: string; 
    maxStudents: number;
    price: number; 
  }) {
    
    if (!data.subjectIdOrName || data.subjectIdOrName.trim() === '') {
      throw new BadRequestException("Lỗi: Dữ liệu môn học bị trống.");
    }

    return this.prisma.$transaction(async (tx) => {
      let finalSubjectId = '';
      const cleanInput = data.subjectIdOrName.trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput);

      let existingSubject: any = null; 

      if (isUUID) {
        existingSubject = await tx.subject.findUnique({ where: { id: cleanInput } });
      } else {
        existingSubject = await tx.subject.findFirst({
          where: { name: { equals: cleanInput, mode: 'insensitive' } } 
        });
      }

      if (existingSubject) {
        finalSubjectId = existingSubject.id;
      } else {
        const autoCode = `SUB_${Date.now()}`; 
        const newSubject = await tx.subject.create({
          data: { name: cleanInput, subjectCode: autoCode }
        });
        finalSubjectId = newSubject.id; 
      }

      const existingClass = await tx.class.findUnique({
        where: { classCode: data.classCode },
      });

      if (existingClass) {
        throw new BadRequestException(`Mã lớp '${data.classCode}' đã tồn tại!`);
      }

      const newClass = await tx.class.create({
        data: {
          classCode: data.classCode,
          maxStudents: data.maxStudents, 
          price: data.price >= 0 ? data.price : 0, 
          status: 'ACTIVE', 
          subject: { connect: { id: finalSubjectId } },
          teacher: { connect: { id: data.teacherId } }
        },
      });

      await tx.courseSection.create({
        data: {
          title: 'Chung',
          order: 0,
          class: { connect: { id: newClass.id } }
        },
      });

      return newClass;
    });
  }

  // ==========================================
  // 3. CÁC HÀM QUẢN LÝ LỚP HỌC KHÁC
  // ==========================================

  async markClassAsCompleted(classId: string, teacherId: string) {
    const classObj = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!classObj) throw new NotFoundException('Không tìm thấy lớp học này');
    if (classObj.teacherId !== teacherId) throw new BadRequestException('Bạn không có quyền thao tác trên lớp này');

    const updatedClass = await this.prisma.class.update({
      where: { id: classId },
      data: { status: 'COMPLETED' }
    });

    return { message: 'Đã kết thúc lớp học thành công', course: updatedClass };
  }

  async reopenClass(classId: string, teacherId: string) {
    const classObj = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!classObj) throw new NotFoundException('Không tìm thấy lớp học này');
    if (classObj.teacherId !== teacherId) throw new BadRequestException('Bạn không có quyền thao tác trên lớp này');

    return this.prisma.class.update({
      where: { id: classId },
      data: { status: 'ACTIVE' } 
    });
  }

  async getClassesByTeacher(teacherId: string) {
    const teacherClasses = await this.prisma.class.findMany({
      where: { teacherId: teacherId },
      include: {
        subject: true,
        _count: { select: { students: true } }, 
      },
      orderBy: { createdAt: 'desc' },
    });

    return teacherClasses.map((c) => ({
      id: c.id,
      classCode: c.classCode,
      subjectName: c.subject?.name || 'Môn học ẩn',
      subjectCode: c.subject?.subjectCode || 'N/A',
      maxStudents: c.maxStudents,
      price: c.price, 
      status: c.status,
      coverImageUrl: c.coverImageUrl,
      studentCount: c._count?.students || 0,
      createdAt: c.createdAt,
    }));
  }

  async getClassesByStudent(studentId: string) {
    const classStudents = await this.prisma.classStudent.findMany({
      where: { studentId: studentId },
      include: {
        class: {
          include: {
            subject: true,
            teacher: { select: { fullName: true, email: true } },
            _count: { select: { students: true } }, 
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return classStudents.map((cs) => ({
      id: cs.class.id,
      classCode: cs.class.classCode,
      subjectName: cs.class.subject?.name || 'Môn học ẩn',
      teacherName: cs.class.teacher?.fullName || 'Chưa phân công',
      maxStudents: cs.class.maxStudents,
      price: cs.class.price,
      status: cs.class.status,
      joinedAt: cs.joinedAt,
      studentCount: cs.class._count?.students || 0,
      coverImageUrl: cs.class.coverImageUrl, 
    }));
  }

  async getClassDetail(classId: string) {
    const classObj = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        subject: true,
        teacher: { select: { fullName: true, avatarUrl: true, email: true } }, 
        courseSections: {
          include: { 
            activities: { 
              include: { exam: true }, // THÊM DÒNG NÀY ĐỂ LẤY THỜI GIAN THI
              orderBy: { createdAt: 'asc' } 
            } 
          },
          orderBy: { order: 'asc' } 
        },
        _count: { select: { students: true } }
      }
    });

    if (!classObj) throw new NotFoundException('Không tìm thấy lớp học này!');

    return {
      course: {
        teacherId: classObj.teacherId, 
        subjectName: classObj.subject?.name || 'Môn học',
        subjectCode: classObj.subject?.subjectCode || 'N/A',
        classCode: classObj.classCode,
        maxStudents: classObj.maxStudents,
        currentStudents: classObj._count?.students || 0,
        price: classObj.price, 
        status: classObj.status,
        coverImageUrl: classObj.coverImageUrl || null,
        teacherName: classObj.teacher?.fullName || 'Khoa/Bộ môn',
        teacherAvatar: classObj.teacher?.avatarUrl || null,
        teacherEmail: classObj.teacher?.email || 'Chưa cập nhật',
      },
      sections: classObj.courseSections
    };
  }

  async getAvailableClassesForStudent(studentId: string) {
    const allClasses = await this.prisma.class.findMany({
      where: { status: 'ACTIVE' },
      include: {
        subject: true,
        teacher: { select: { fullName: true, avatarUrl: true } },
        _count: { select: { students: true, courseSections: true, reviews: true } },
        students: { where: { studentId } }, 
        reviews: { select: { rating: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });

    return allClasses
      .filter(c => c.students.length === 0) 
      .map(c => {
        const reviewCount = c._count.reviews;
        const avgRating = reviewCount > 0 
          ? Number((c.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)) 
          : 0;

        return {
          id: c.id,
          classCode: c.classCode,
          subjectName: c.subject?.name || 'Môn học ẩn',
          teacherName: c.teacher?.fullName || 'Chưa phân công',
          maxStudents: c.maxStudents,
          currentStudents: c._count.students,
          price: c.price,
          coverImageUrl: c.coverImageUrl,
          moduleCount: c._count.courseSections, 
          createdAt: c.createdAt,
          teacherAvatar: c.teacher?.avatarUrl,
          avgRating,       
          reviewCount      
        };
      });
  }

  async getPublicAvailableClasses() {
    const allClasses = await this.prisma.class.findMany({
      where: { status: 'ACTIVE' },
      include: {
        subject: true,
        teacher: { select: { fullName: true, avatarUrl: true } },
        _count: { select: { students: true, courseSections: true, reviews: true } },
        reviews: { select: { rating: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });

    return allClasses.map(c => {
      const reviewCount = c._count.reviews;
      const avgRating = reviewCount > 0 
        ? Number((c.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)) 
        : 0;

      return {
        id: c.id,
        classCode: c.classCode,
        subjectName: c.subject?.name || 'Môn học ẩn',
        teacherName: c.teacher?.fullName || 'Chưa phân công',
        maxStudents: c.maxStudents,
        currentStudents: c._count.students,
        price: c.price,
        moduleCount: c._count.courseSections, 
        createdAt: c.createdAt,
        coverImageUrl: c.coverImageUrl,
        teacherAvatar: c.teacher?.avatarUrl,
        avgRating,       
        reviewCount      
      };
    });
  }

  // ==============================================
  // LOGIC ĐĂNG KÝ MỚI: MIỄN PHÍ VÀ TRẢ PHÍ
  // ==============================================
  async joinClass(classId: string, studentId: string) {
    const targetClass = await this.prisma.class.findUnique({ 
      where: { id: classId },
      include: { _count: { select: { students: true } } }
    });

    if (!targetClass) throw new NotFoundException('Lớp học không tồn tại');
    if (targetClass.status !== 'ACTIVE') throw new BadRequestException('Lớp học đã kết thúc');
    if (targetClass._count.students >= targetClass.maxStudents) throw new BadRequestException('Lớp học đã đủ số lượng sinh viên');

    const existingStudent = await this.prisma.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId } }
    });
    if (existingStudent) throw new BadRequestException('Bạn đã là thành viên của lớp này');

    if (targetClass.price === 0) {
      await this.prisma.classStudent.create({
        data: { classId, studentId }
      });
      return { message: 'Đã tham gia lớp học miễn phí thành công!', status: 'JOINED' };
    } 
    else {
      return { 
        message: 'Khóa học này yêu cầu trả phí. Vui lòng tiến hành thanh toán.', 
        status: 'PAYMENT_REQUIRED',
        price: targetClass.price,
      };
    }
  }
  
  async getClassMembers(classId: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } }
      }
    });

    if (!classData) throw new NotFoundException('Không tìm thấy lớp học');

    const classStudents = await this.prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } }
      }
    });

    const students = classStudents.map(cs => cs.student);
    return [classData.teacher, ...students];
  }

 
  async getStudentGradesInClass(classId: string, studentId: string) {
    const sections = await this.prisma.courseSection.findMany({
      where: { classId: classId },
      include: {
        activities: {
          where: { type: { in: ['ASSIGNMENT', 'EXAM'] } }, // Sửa ở đây
          include: { submissions: { where: { studentId: studentId } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const activities = sections.flatMap(section => section.activities);
    let totalAssignmentScore = 0; let gradedAssignmentCount = 0; 
    let totalExamScore = 0; let gradedExamCount = 0; // Sửa biến
    let submittedCount = 0; 

    const gradesList = activities.map((act: any) => {
      const userSubmission = act.submissions[0];
      const rawScore = userSubmission?.score;
      const score = (rawScore !== null && rawScore !== undefined) ? parseFloat(rawScore.toString()) : null;
      const weight = act.type === 'ASSIGNMENT' ? 30 : 70;

      if (userSubmission) submittedCount++;

      if (score !== null) {
        if (act.type === 'ASSIGNMENT') { totalAssignmentScore += score; gradedAssignmentCount++; } 
        else if (act.type === 'EXAM') { totalExamScore += score; gradedExamCount++; } // Sửa ở đây
      }
      
      return { activityId: act.id, activityTitle: act.title, activityType: act.type, score: score, weight: weight, hasFeedback: !!userSubmission?.feedback };
    });

    const avgAssignment = gradedAssignmentCount > 0 ? (totalAssignmentScore / gradedAssignmentCount) : 0;
    const avgExam = gradedExamCount > 0 ? (totalExamScore / gradedExamCount) : 0; // Sửa biến
    
    let finalScore = 0;
    const hasAnyGrade = gradedAssignmentCount > 0 || gradedExamCount > 0;

    if (hasAnyGrade) {
      const currentWeight = (gradedAssignmentCount > 0 ? 0.3 : 0) + (gradedExamCount > 0 ? 0.7 : 0);
      const weightedScore = (avgAssignment * 0.3) + (avgExam * 0.7);
      finalScore = Math.round((weightedScore / currentWeight) * 100) / 100; 
    }

    let letterGrade = 'F'; let statusColor = '#ef4444'; let statusText = 'Kém/Trượt';
    if (finalScore >= 8.5) { letterGrade = 'A'; statusColor = '#10b981'; statusText = 'Giỏi'; }
    else if (finalScore >= 7.0) { letterGrade = 'B'; statusColor = '#3b82f6'; statusText = 'Khá'; }
    else if (finalScore >= 5.5) { letterGrade = 'C'; statusColor = '#f59e0b'; statusText = 'Trung bình'; }
    else if (finalScore >= 4.0) { letterGrade = 'D'; statusColor = '#f97316'; statusText = 'Yếu'; }

    return {
      gradesList,
      progress: { totalActivities: activities.length, submittedCount: submittedCount, percentage: activities.length > 0 ? Math.round((submittedCount / activities.length) * 100) : 0 },
      summary: hasAnyGrade ? {
        finalScore, letterGrade, statusText, statusColor,
        avgAssignment: gradedAssignmentCount > 0 ? Math.round(avgAssignment * 100) / 100 : '--',
        avgExam: gradedExamCount > 0 ? Math.round(avgExam * 100) / 100 : '--' 
      } : null
    };
  }

  async getAllTeacherReviews(teacherId: string) {
    const reviews = await this.prisma.classReview.findMany({
      where: { class: { teacherId: teacherId } },
      include: { 
        student: { select: { fullName: true, avatarUrl: true } },
        class: { select: { id: true, classCode: true, subject: { select: { name: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const avgRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0;

    return { reviews, avgRating: avgRating.toFixed(1), total: reviews.length };
  }

  async getClassReviews(classId: string, studentId: string | null) {
    const reviews = await this.prisma.classReview.findMany({
      where: { classId },
      include: { student: { select: { fullName: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    let isMember = false;
    if (studentId) {
      const membership = await this.prisma.classStudent.findUnique({
        where: { classId_studentId: { classId, studentId } }
      });
      isMember = !!membership;
    }

    const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
    const myReview = studentId ? reviews.find(r => r.studentId === studentId) : null;

    return { reviews, avgRating: avgRating.toFixed(1), total: reviews.length, canReview: isMember, myReview };
  }

  async submitReview(classId: string, studentId: string, rating: number, comment: string) {
    const isMember = await this.prisma.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId } }
    });
    if (!isMember) throw new BadRequestException('Bạn phải là thành viên của lớp mới được đánh giá!');

    return this.prisma.classReview.upsert({
      where: { classId_studentId: { classId, studentId } },
      update: { rating, comment },
      create: { classId, studentId, rating, comment }
    });
  }

  async updateSection(sectionId: string, title: string) {
    return this.prisma.courseSection.update({ where: { id: sectionId }, data: { title } });
  }

  async deleteSection(sectionId: string) {
    return this.prisma.courseSection.delete({ where: { id: sectionId } });
  }

  async createSection(classId: string, title: string) {
    const lastSection = await this.prisma.courseSection.findFirst({
      where: { classId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastSection ? lastSection.order + 1 : 1;
    return this.prisma.courseSection.create({
      data: { title, order: nextOrder, class: { connect: { id: classId } } },
    });
  }

  async getMembersPaged(classId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [members, total] = await Promise.all([
      this.prisma.classStudent.findMany({
        where: { classId: classId, student: { role: 'STUDENT' } },
        include: { student: { select: { id: true, fullName: true, email: true, avatarUrl: true, role: true } } },
        skip, take: limit,
        orderBy: { student: { fullName: 'asc' } },
      }),
      this.prisma.classStudent.count({ where: { classId: classId, student: { role: 'STUDENT' } } }),
    ]);

    return { data: members.map(m => m.student), total, page, lastPage: Math.ceil(total / limit) };
  }

  async removeStudentFromClass(classId: string, studentId: string) {
    const membership = await this.prisma.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId } },
      include: { student: true, class: { include: { subject: true } } }
    });

    if (!membership) throw new NotFoundException('Không tìm thấy sinh viên trong lớp này');

    await this.prisma.classStudent.delete({
      where: { classId_studentId: { classId, studentId } },
    });

    this.mailService.sendMail(
      membership.student.email,
      `[EduExam] Thông báo xóa khỏi lớp học ${membership.class.classCode}`,
      `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #dc2626;">Chào ${membership.student.fullName},</h2>
          <p>Chúng tôi thông báo rằng bạn đã bị giảng viên xóa khỏi danh sách lớp học: <b>${membership.class.classCode} - ${membership.class.subject.name}</b>.</p>
          <p>Mọi dữ liệu bài làm và điểm số liên quan đến lớp học này sẽ không còn hiển thị trong tài khoản của bạn.</p>
          <p>Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ trực tiếp với giảng viên phụ trách.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888;">Đây là email tự động từ hệ thống EduExam, vui lòng không phản hồi email này.</p>
        </div>
      `
    ).catch(error => {
      console.log("Lỗi gửi email đuổi học sinh:", error.message);
    });

    return { message: 'Đã xóa sinh viên khỏi lớp thành công' };
  }

  // ĐÃ SỬA: Thay thế QUIZ thành EXAM
  async getGradebook(classId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const activities = await this.prisma.courseActivity.findMany({
      where: { section: { classId: classId }, type: { in: ['ASSIGNMENT', 'EXAM'] } }, // Sửa ở đây
      select: { id: true, title: true, type: true },
      orderBy: { createdAt: 'asc' }
    });

    const [students, total] = await Promise.all([
      this.prisma.classStudent.findMany({
        where: { classId, student: { role: 'STUDENT' } },
        include: { student: { select: { id: true, fullName: true, email: true } } },
        skip, take: limit,
        orderBy: { student: { fullName: 'asc' } },
      }),
      this.prisma.classStudent.count({ where: { classId, student: { role: 'STUDENT' } } }),
    ]);

    const studentGrades = await Promise.all(students.map(async (cs) => {
      const studentId = cs.studentId;
      const scores = {};
      let sumAssignment = 0; let countAssignment = 0;
      let sumExam = 0; let countExam = 0; // Sửa biến

      for (const act of activities) {
        let scoreValue: number | null = null;
        if (act.type === 'ASSIGNMENT') {
          const submission = await this.prisma.assignmentSubmission.findFirst({
            where: { activityId: act.id, studentId }, select: { score: true }
          });
          scoreValue = submission?.score ? Number(submission.score) : null;
          if (scoreValue !== null) { sumAssignment += scoreValue; countAssignment++; }
        } 
        else if (act.type === 'EXAM') { // Sửa ở đây
          const courseAct = await this.prisma.courseActivity.findUnique({
            where: { id: act.id }, select: { examId: true }
          });
          if (courseAct?.examId) {
            const session = await this.prisma.examSession.findFirst({
              where: { examId: courseAct.examId, studentId }, select: { totalScore: true }
            });
            scoreValue = session?.totalScore ? Number(session.totalScore) : null;
          }
          if (scoreValue !== null) { sumExam += scoreValue; countExam++; } // Sửa ở đây
        }
        scores[act.id] = scoreValue;
      }

      const avgAssignment = countAssignment > 0 ? (sumAssignment / countAssignment) : null;
      const avgExam = countExam > 0 ? (sumExam / countExam) : null; // Sửa biến
      let finalScore: number | null = null;
      
      if (avgAssignment !== null && avgExam !== null) finalScore = (avgAssignment * 0.3) + (avgExam * 0.7);
      else if (avgAssignment !== null) finalScore = avgAssignment;
      else if (avgExam !== null) finalScore = avgExam;

      let letterGrade = '--';
      if (finalScore !== null) {
        if (finalScore >= 8.5) letterGrade = 'A';
        else if (finalScore >= 7.0) letterGrade = 'B';
        else if (finalScore >= 5.5) letterGrade = 'C';
        else if (finalScore >= 4.0) letterGrade = 'D';
        else letterGrade = 'F';
      }

      return {
        studentId,
        fullName: cs.student.fullName,
        email: cs.student.email,
        scores,
        finalScore, 
        letterGrade
      };
    }));

    const formattedActivities = activities.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      weight: a.type === 'EXAM' ? 70 : 30 // Sửa ở đây
    }));

    return {
      activities: formattedActivities,
      students: studentGrades,
      total, page, lastPage: Math.ceil(total / limit)
    };
  }

  async updateClassSettings(classId: string, body: any, file?: Express.Multer.File) {
    const price = parseFloat(body.price);
    const maxStudents = parseInt(body.maxStudents, 10);

    if (isNaN(maxStudents) || maxStudents <= 0) throw new BadRequestException('Sĩ số tối đa không hợp lệ');

    const currentStudentCount = await this.prisma.classStudent.count({
      where: { classId: classId, student: { role: 'STUDENT' } }
    });

    if (maxStudents < currentStudentCount) {
      throw new BadRequestException(`Giới hạn sĩ số không được nhỏ hơn sĩ số hiện tại (${currentStudentCount})!`);
    }

    const updateData: any = { maxStudents };
    if (!isNaN(price) && price >= 0) {
      updateData.price = price; 
    }

    if (file) updateData.coverImageUrl = `/uploads/courses/${file.filename}`;

    try {
      const updatedClass = await this.prisma.class.update({
        where: { id: classId },
        data: updateData,
      });
      return { message: 'Cập nhật cài đặt lớp học thành công', course: updatedClass };
    } catch (error) {
      throw new BadRequestException('Lỗi khi cập nhật cơ sở dữ liệu');
    }
  }

  async searchPublicClasses(query: string, userId?: string | null) {
    if (userId) {
      const classes = await this.prisma.class.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { classCode: { contains: query, mode: 'insensitive' } },
            { subject: { name: { contains: query, mode: 'insensitive' } } }
          ]
        },
        select: { 
          id: true, 
          classCode: true, 
          coverImageUrl: true,
          subject: { 
            select: { name: true } 
          },
          students: {
            where: { studentId: userId },
            select: { classId: true } 
          }
        },
        take: 5 
      });

      return classes.map(c => ({ 
        id: c.id, 
        name: c.subject?.name || c.classCode, 
        code: c.classCode,
        coverImageUrl: c.coverImageUrl,
        isJoined: c.students.length > 0 
      }));
    } 
    else {
      const classes = await this.prisma.class.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { classCode: { contains: query, mode: 'insensitive' } },
            { subject: { name: { contains: query, mode: 'insensitive' } } }
          ]
        },
        select: { 
          id: true, 
          classCode: true, 
          coverImageUrl: true,
          subject: { 
            select: { name: true } 
          }
        },
        take: 5 
      });

      return classes.map(c => ({ 
        id: c.id, 
        name: c.subject?.name || c.classCode, 
        code: c.classCode,
        coverImageUrl: c.coverImageUrl,
        isJoined: false 
      }));
    }
  }

  async getPendingSubmissions(classId: string) {
    try {
      // 1. Lấy bài tập (Assignment) chưa chấm
      const assignments = await this.prisma.assignmentSubmission.findMany({
        where: { score: null, activity: { section: { classId: classId } } },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          activity: { select: { id: true, title: true } }
        }
      });

      // 2. Lấy bài thi (Exam) chưa chấm xong (Trạng thái SUBMITTED)
      const exams = await this.prisma.examSession.findMany({
        where: { 
          status: 'SUBMITTED', 
          exam: { classId: classId } 
        },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          exam: { 
            include: { courseActivity: { select: { id: true, title: true } } } 
          }
        }
      });

      const formattedAssignments = assignments.map(a => ({
        id: a.id,
        type: 'ASSIGNMENT',
        studentName: a.student?.fullName || 'Sinh viên',
        email: a.student?.email,
        activityTitle: a.activity?.title || 'Bài tập',
        activityId: a.activityId,
        submittedAt: a.submittedAt
      }));

      const formattedExams = exams.map(e => ({
        id: e.id,
        type: 'EXAM',
        studentName: e.student?.fullName || 'Sinh viên',
        email: e.student?.email,
        activityTitle: e.exam?.courseActivity?.title || e.exam?.title || 'Bài thi',
        activityId: e.exam?.courseActivity?.id,
        examId: e.examId,
        submittedAt: e.startTime // Sử dụng startTime nếu không có submitTime, hoặc lý tưởng là submitTime
      }));

      const allPending = [...formattedAssignments, ...formattedExams];
      // Sắp xếp bài nộp mới nhất lên đầu
      allPending.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      return allPending;
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy danh sách bài chờ chấm: ' + error.message);
    }
  }

  async getTeacherProfile(teacherId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId }, 
      select: { id: true, fullName: true, email: true, avatarUrl: true }
    });

    if (!teacher) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên này!');
    }

    const classes = await this.prisma.class.findMany({
      where: { teacherId: teacherId, status: 'ACTIVE' },
      include: {
        subject: true,
        _count: { select: { students: true, courseSections: true, reviews: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedClasses = classes.map(c => {
      const reviewCount = c._count.reviews;
      const avgRating = reviewCount > 0 
        ? Number((c.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)) 
        : 0;

      return {
        id: c.id,
        classCode: c.classCode,
        subjectName: c.subject?.name || 'Môn học ẩn',
        teacherName: teacher.fullName,
        maxStudents: c.maxStudents,
        currentStudents: c._count.students,
        price: c.price,
        moduleCount: c._count.courseSections, 
        coverImageUrl: c.coverImageUrl,
        teacherAvatar: teacher.avatarUrl,
        avgRating,
        reviewCount
      };
    });

    return {
      teacher,
      courses: formattedClasses
    };
  }
}