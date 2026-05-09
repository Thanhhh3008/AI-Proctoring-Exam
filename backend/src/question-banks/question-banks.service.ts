import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class QuestionBanksService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // NGÂN HÀNG CÂU HỎI (QUESTION BANKS)
  // ==========================================

  // 1. Lấy danh sách ngân hàng của một lớp
  async getBanksByClassId(classId: string) {
    const banks = await this.prisma.questionBank.findMany({
      where: { classId },
      include: {
        _count: {
          select: { questions: true }, // Đếm tổng số câu hỏi trong ngân hàng
        },
        questions: {
          select: { questionType: true, difficulty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format lại dữ liệu trả về cho Frontend dễ dùng
    return banks.map((bank) => {
      // Đếm chi tiết từng loại
      const mcqEasy = bank.questions.filter(q => q.questionType === 'MULTIPLE_CHOICE' && q.difficulty === 'EASY').length;
      const mcqMedium = bank.questions.filter(q => q.questionType === 'MULTIPLE_CHOICE' && q.difficulty === 'MEDIUM').length;
      const mcqHard = bank.questions.filter(q => q.questionType === 'MULTIPLE_CHOICE' && q.difficulty === 'HARD').length;
      const essayEasy = bank.questions.filter(q => q.questionType === 'ESSAY' && q.difficulty === 'EASY').length;
      const essayMedium = bank.questions.filter(q => q.questionType === 'ESSAY' && q.difficulty === 'MEDIUM').length;
      const essayHard = bank.questions.filter(q => q.questionType === 'ESSAY' && q.difficulty === 'HARD').length;

      return {
        id: bank.id,
        name: bank.name,
        createdAt: bank.createdAt,
        questionCount: bank._count.questions,
        breakdown: {
          mcq: { easy: mcqEasy, medium: mcqMedium, hard: mcqHard },
          essay: { easy: essayEasy, medium: essayMedium, hard: essayHard }
        }
      };
    });
  }

  async createBank(classId: string, name: string, teacherId: string) { // <--- Thêm tham số teacherId
    return this.prisma.questionBank.create({
      data: {
        classId,
        name,
        teacherId, 
      },
    });
  }
  // 3. Xóa Ngân hàng
  async deleteBank(bankId: string) {
    // 1. Kiểm tra xem ngân hàng có câu hỏi nào đang được dùng trong bài thi cứng (ExamQuestion) không
    const usedQuestions = await this.prisma.examQuestion.findFirst({
      where: {
        question: {
          bankId: bankId
        }
      }
    });

    if (usedQuestions) {
      throw new BadRequestException('Không thể xóa ngân hàng này vì có câu hỏi đang được sử dụng trong bài thi!');
    }

    // 2. Kiểm tra xem ngân hàng có đang được dùng làm Nguồn (generationRules) cho kỳ thi nào không
    const exams = await this.prisma.exam.findMany();

    const isUsedInRules = exams.some(exam => {
      const rules = exam.generationRules as any;
      return rules?.bankIds && Array.isArray(rules.bankIds) && rules.bankIds.includes(bankId);
    });

    if (isUsedInRules) {
      throw new BadRequestException('Không thể xóa ngân hàng này vì nó đang được cấu hình làm nguồn phát sinh câu hỏi cho một bài thi!');
    }

    // 3. Nếu không bị dính đề thi nào thì cho phép xóa
    return this.prisma.questionBank.delete({
      where: { id: bankId },
    });
  }

  // ==========================================
  // CÂU HỎI (QUESTIONS)
  // ==========================================

  // 4. Lấy chi tiết Ngân hàng và danh sách Câu hỏi bên trong
  async getBankWithQuestions(bankId: string) {
    const bank = await this.prisma.questionBank.findUnique({
      where: { id: bankId },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' }, // Sắp xếp câu hỏi theo thứ tự tạo
        },
        class: {
          select: { classCode: true }, // Lấy mã lớp để hiển thị trên Breadcrumb
        },
      },
    });

    if (!bank) throw new NotFoundException('Không tìm thấy Ngân hàng câu hỏi!');

    return {
      id: bank.id,
      name: bank.name,
      classId: bank.classId,
      classCode: bank.class?.classCode,
      questions: bank.questions.map(q => ({
        id: q.id,
        type: q.questionType,
        difficulty: q.difficulty,
        content: q.content,
        // Vì options đang lưu dạng JSON, Prisma sẽ tự parse ra Object/Array
        options: q.options, 
      })),
    };
  }

  // 5. Thêm Câu hỏi mới
  async createQuestion(bankId: string, data: any) {
    let correctAnswerStr = null;
    if (data.type === 'MULTIPLE_CHOICE' && data.options) {
      const correctOpt = data.options.find((opt: any) => opt.isCorrect);
      if (correctOpt) {
        correctAnswerStr = correctOpt.id;
      }
    }

    return this.prisma.question.create({
      data: {
        bankId,
        questionType: data.type,
        difficulty: data.difficulty,
        content: data.content,
        options: data.options ? data.options : null, // Cột options kiểu JSON
        correctAnswer: correctAnswerStr,
      },
    });
  }

  // 6. Cập nhật Câu hỏi
  async updateQuestion(questionId: string, data: any) {
    let correctAnswerStr = null;
    if (data.type === 'MULTIPLE_CHOICE' && data.options) {
      const correctOpt = data.options.find((opt: any) => opt.isCorrect);
      if (correctOpt) {
        correctAnswerStr = correctOpt.id;
      }
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        questionType: data.type,
        difficulty: data.difficulty,
        content: data.content,
        options: data.options ? data.options : null,
        correctAnswer: correctAnswerStr,
      },
    });
  }

  // 7. Xóa Câu hỏi
  async deleteQuestion(questionId: string) {
    return this.prisma.question.delete({
      where: { id: questionId },
    });
  }
}