import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async getExamById(id: string, studentId?: string) { 
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { examQuestions: { include: { question: true } } }
    });

    if (!exam) throw new NotFoundException('Không tìm thấy kỳ thi');

    const now = new Date();
    let currentDisplayStatus = exam.status;

    if (exam.status !== 'LOCKED' && exam.status !== 'ENDED') {
      if (now < exam.startTime) {
        currentDisplayStatus = 'UPCOMING' as any;
      } else if (now >= exam.startTime && now <= exam.endTime) {
        currentDisplayStatus = 'ONGOING' as any;
      } else {
        currentDisplayStatus = 'ENDED' as any;
      }
    }

    let studentSessionStatus: string | null = null;
    let studentScore: number | null = null; 
    let studentSessionId: string | null = null;
    
    if (studentId) {
      const session = await this.prisma.examSession.findUnique({
        where: { examId_studentId: { examId: id, studentId } }
      });
      if (session) {
        studentSessionStatus = session.status;
        studentScore = session.totalScore ? session.totalScore.toNumber() : null;
        studentSessionId = session.id;
      }
    }

    return { ...exam, currentDisplayStatus, studentSessionStatus, studentScore, studentSessionId };
  }
  async updateExam(id: string, data: any) {
    const existingExam = await this.prisma.exam.findUnique({
      where: { id }
    });

    if (!existingExam) {
      throw new NotFoundException('Không tìm thấy kỳ thi để cập nhật');
    }

    return this.prisma.exam.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : undefined,
        maxQuestions: data.maxQuestions ? parseInt(data.maxQuestions, 10) : undefined,
        generationRules: data.generationRules,
        status: data.status, 
        strictMode: data.strictMode,
        requireCamera: data.requireCamera
      }
    });
  }

  // =======================================================
  // HÀM TIỆN ÍCH: BỐC ĐỀ NGẪU NHIÊN THEO LUẬT
  // =======================================================
  private async generateRandomQuestions(rules: any) {
    if (!rules || !rules.bankIds || rules.bankIds.length === 0) {
      throw new BadRequestException('Kỳ thi chưa được thiết lập nguồn ngân hàng câu hỏi.');
    }

    let selectedQuestions: any[] = [];

    // Hàm bốc ngẫu nhiên
    const fetchRandom = async (type: 'MULTIPLE_CHOICE' | 'ESSAY', diff: 'EASY' | 'MEDIUM' | 'HARD', limit: number) => {
      if (limit <= 0) return [];
      const qs = await this.prisma.question.findMany({
        where: { bankId: { in: rules.bankIds }, questionType: type, difficulty: diff }
      });
      // Xáo trộn mảng bằng sort
      return qs.sort(() => 0.5 - Math.random()).slice(0, limit);
    };

    // Thực hiện bốc cho từng loại và độ khó
    const mcqRules = rules.mcq || { easy: 0, medium: 0, hard: 0 };
    const essayRules = rules.essay || { easy: 0, medium: 0, hard: 0 };

    selectedQuestions = [
      ...(await fetchRandom('MULTIPLE_CHOICE', 'EASY', mcqRules.easy)),
      ...(await fetchRandom('MULTIPLE_CHOICE', 'MEDIUM', mcqRules.medium)),
      ...(await fetchRandom('MULTIPLE_CHOICE', 'HARD', mcqRules.hard)),
      ...(await fetchRandom('ESSAY', 'EASY', essayRules.easy)),
      ...(await fetchRandom('ESSAY', 'MEDIUM', essayRules.medium)),
      ...(await fetchRandom('ESSAY', 'HARD', essayRules.hard)),
    ];

    // Trộn ngẫu nhiên lại toàn bộ đề trước khi trả về
    return selectedQuestions.sort(() => 0.5 - Math.random());
  }

  // =======================================================
  // 1. BẮT ĐẦU HOẶC TIẾP TỤC PHIÊN THI
  // =======================================================
  async startExamSession(examId: string, studentId: string) {
    // 1. Kiểm tra session hiện có
    let session = await this.prisma.examSession.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: { 
        answers: { include: { question: true }, orderBy: { order: 'asc' } } 
      }
    });

    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Đề thi không tồn tại');

    // Nếu đã nộp bài rồi thì không cho vào lại
    if (session && session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Bạn đã hoàn thành bài thi này trước đó.');
    }

    // Nếu chưa có session -> Tạo mới (Bốc đề)
    if (!session) {
      const rules: any = exam.generationRules;
      const selectedQuestions = await this.generateRandomQuestions(rules);

      if (selectedQuestions.length === 0) {
        throw new BadRequestException('Hệ thống không bốc được câu hỏi nào từ Ngân hàng. Vui lòng báo Giám thị!');
      }

      session = await this.prisma.$transaction(async (tx) => {
        const newSession = await tx.examSession.create({
          data: { examId, studentId, status: 'IN_PROGRESS' }
        });

        await tx.sessionAnswer.createMany({
          data: selectedQuestions.map((q, index) => ({
            sessionId: newSession.id,
            questionId: q.id,
            order: index
          }))
        });

        return tx.examSession.findUnique({
          where: { id: newSession.id },
          include: { answers: { include: { question: true }, orderBy: { order: 'asc' } } }
        });
      });
    }

    // FIX LỖI BÁO NULL CỦA TYPESCRIPT BẰNG ĐOẠN NÀY:
    if (!session) {
      throw new BadRequestException('Không thể khởi tạo hoặc tìm thấy phiên thi.');
    }

    // Che giấu đáp án đúng trước khi trả về cho Client
    const secureQuestions = session.answers.map(a => {
      const q = a.question;
      const safeQuestion = { ...q, correctAnswer: undefined }; // Ẩn cmn đáp án
      return {
        ...safeQuestion,
        currentAnswer: a.selectedAnswer, // Trả về đáp án SV đã chọn (nháp)
        isFlagged: a.isFlagged
      };
    });

    return {
      examInfo: exam,
      sessionId: session.id,
      sessionStartTime: session.startTime,
      questions: secureQuestions
    };
  }

  // =======================================================
  // 2. LƯU NHÁP ĐÁP ÁN (GỌI TỪNG CÂU)
  // =======================================================
  async updateDraftAnswer(sessionId: string, questionId: string, answer: string| null) {
    return this.prisma.sessionAnswer.updateMany({
      where: { sessionId, questionId },
      data: { selectedAnswer: answer }
    });
  }

  // =======================================================
  // 3. NỘP BÀI VÀ CHẤM ĐIỂM
  // =======================================================
  async submitExam(examId: string, studentId: string, payload: any) {
    const { answers, violationLogs } = payload;
    
    const session = await this.prisma.examSession.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: { answers: { include: { question: true } } }
    });

    if (!session || session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Phiên làm bài không tồn tại hoặc đã được nộp.');
    }

    let mcqScore = 0; // Điểm của các câu trắc nghiệm
    let hasEssay = false; // Cờ kiểm tra bài thi có tự luận không

    const totalQuestions = session.answers.length;
    const pointPerQuestion = 10 / (totalQuestions || 1);

    await this.prisma.$transaction(async (tx) => {
      for (const sa of session.answers) {
        const studentAnswerStr = answers[sa.questionId] || null;
        const q = sa.question;

        let achievedScore: number | null = null; // Mặc định null (Chờ chấm)

        if (q.questionType === 'MULTIPLE_CHOICE') {
           // NẾU LÀ TRẮC NGHIỆM -> CHẤM TỰ ĐỘNG
           if (studentAnswerStr && studentAnswerStr === q.correctAnswer) {
             achievedScore = pointPerQuestion;
             mcqScore += pointPerQuestion;
           } else {
             achievedScore = 0; // Sai là 0 điểm
           }
        } else if (q.questionType === 'ESSAY') {
           // NẾU LÀ TỰ LUẬN -> BẬT CỜ BÁO HIỆU & GIỮ NGUYÊN NULL ĐỂ GV CHẤM
           hasEssay = true;
        }
        
        await tx.sessionAnswer.update({
          where: { id: sa.id },
          data: { 
            selectedAnswer: studentAnswerStr,
            achievedScore: achievedScore
          }
        });
      }

      // NẾU CÓ TỰ LUẬN -> TỔNG ĐIỂM = NULL (CHỜ GV CHẤM). NẾU TOÀN TRẮC NGHIỆM -> GHI NHẬN ĐIỂM LUÔN
      await tx.examSession.update({
        where: { id: session.id },
        data: {
          status: 'SUBMITTED',
          submitTime: new Date(),
          totalScore: hasEssay ? null : mcqScore 
        }
      });

      if (violationLogs && violationLogs.length > 0) {
        await tx.violationLog.create({
           data: {
             sessionId: session.id,
             type: 'TAB_SWITCH',
             metadata: { logs: violationLogs }
           }
        });
      }
    });

    return { 
      success: true, 
      message: hasEssay 
        ? 'Nộp bài thành công! Phần tự luận đang chờ Giảng viên chấm điểm.' 
        : 'Nộp bài thành công!', 
      score: hasEssay ? null : mcqScore.toFixed(2),
      hasEssay: hasEssay
    };
  }

  // =======================================================
  // 4. LẤY DANH SÁCH PHIÊN THI (DÀNH CHO GIẢNG VIÊN CHẤM BÀI)
  // =======================================================
  async getExamSessions(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: { select: { id: true, classCode: true } },
        courseActivity: { select: { id: true } }
      }
    });

    if (!exam) throw new NotFoundException('Không tìm thấy kỳ thi');

    // Lấy tất cả phiên thi đã nộp
    const sessions = await this.prisma.examSession.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        answers: {
          include: { question: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { submitTime: 'desc' }
    });

    // Tính toán thống kê cho mỗi phiên
    const sessionsWithStats = sessions.map(session => {
      const totalQuestions = session.answers.length;
      const essayAnswers = session.answers.filter(a => a.question.questionType === 'ESSAY');
      const ungradedEssays = essayAnswers.filter(a => a.achievedScore === null);
      const hasEssay = essayAnswers.length > 0;
      const needsGrading = hasEssay && ungradedEssays.length > 0;

      return {
        id: session.id,
        student: session.student,
        status: session.status,
        startTime: session.startTime,
        submitTime: session.submitTime,
        totalScore: session.totalScore ? Number(session.totalScore) : null,
        totalQuestions,
        essayCount: essayAnswers.length,
        ungradedCount: ungradedEssays.length,
        needsGrading,
        hasEssay
      };
    });

    // Lấy tổng sinh viên trong lớp
    const totalStudents = await this.prisma.classStudent.count({
      where: { classId: exam.classId }
    });

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        classCode: exam.class.classCode,
        maxQuestions: exam.maxQuestions,
        courseActivity: exam.courseActivity
      },
      totalStudents,
      sessions: sessionsWithStats
    };
  }

  // =======================================================
  // 5. XEM CHI TIẾT BÀI THI CỦA 1 SINH VIÊN (ĐỂ CHẤM)
  // =======================================================
  async getSessionDetail(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        exam: { select: { id: true, title: true, durationMinutes: true, maxQuestions: true } },
        answers: {
          include: { question: true },
          orderBy: { order: 'asc' }
        },
        violationLogs: true
      }
    });

    if (!session) throw new NotFoundException('Không tìm thấy phiên thi');

    // Trả về đầy đủ thông tin bao gồm câu hỏi, đáp án SV, đáp án đúng (cho MCQ), và điểm từng câu
    const detailedAnswers = session.answers.map(a => ({
      id: a.id,
      order: a.order,
      questionId: a.questionId,
      questionType: a.question.questionType,
      questionContent: a.question.content,
      difficulty: a.question.difficulty,
      options: a.question.options,
      correctAnswer: a.question.correctAnswer,
      studentAnswer: a.selectedAnswer,
      achievedScore: a.achievedScore ? Number(a.achievedScore) : null,
      isFlagged: a.isFlagged
    }));

    return {
      session: {
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        submitTime: session.submitTime,
        totalScore: session.totalScore ? Number(session.totalScore) : null
      },
      student: session.student,
      exam: session.exam,
      answers: detailedAnswers,
      violationLogs: session.violationLogs
    };
  }

  // =======================================================
  // 6. CHẤM ĐIỂM CÂU TỰ LUẬN (TỪNG CÂU MỘT)
  // =======================================================
  async gradeEssayAnswer(answerId: string, score: number, feedback?: string) {
    // Tìm câu trả lời
    const answer = await this.prisma.sessionAnswer.findUnique({
      where: { id: answerId },
      include: { 
        question: true,
        session: {
          include: { answers: { include: { question: true } } }
        }
      }
    });

    if (!answer) throw new NotFoundException('Không tìm thấy câu trả lời');
    if (answer.question.questionType !== 'ESSAY') {
      throw new BadRequestException('Chỉ có thể chấm điểm thủ công cho câu tự luận!');
    }

    const totalQuestions = answer.session.answers.length;
    const pointPerQuestion = 10 / (totalQuestions || 1);

    // Giới hạn điểm tối đa = pointPerQuestion
    if (score < 0) score = 0;
    if (score > pointPerQuestion) score = pointPerQuestion;

    // Cập nhật điểm cho câu trả lời này
    await this.prisma.sessionAnswer.update({
      where: { id: answerId },
      data: { achievedScore: score }
    });

    // Kiểm tra xem tất cả các câu đã được chấm điểm chưa
    // Lấy lại toàn bộ answers sau khi cập nhật
    const allAnswers = await this.prisma.sessionAnswer.findMany({
      where: { sessionId: answer.sessionId },
      include: { question: true }
    });

    const allGraded = allAnswers.every(a => a.achievedScore !== null);

    if (allGraded) {
      // Tính tổng điểm
      const totalScore = allAnswers.reduce((sum, a) => {
        return sum + (a.achievedScore ? Number(a.achievedScore) : 0);
      }, 0);

      // Cập nhật tổng điểm và trạng thái
      await this.prisma.examSession.update({
        where: { id: answer.sessionId },
        data: {
          totalScore: totalScore,
          status: 'GRADED'
        }
      });

      return {
        success: true,
        message: 'Đã chấm xong toàn bộ bài thi!',
        allGraded: true,
        totalScore: totalScore.toFixed(2)
      };
    }

    return {
      success: true,
      message: 'Đã lưu điểm câu tự luận.',
      allGraded: false,
      totalScore: null
    };
  }
}