import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Lấy TẤT CẢ câu hỏi trắc nghiệm có options
  const questions = await prisma.question.findMany({
    where: { questionType: 'MULTIPLE_CHOICE' }
  });

  let fixedCount = 0;
  let skippedCount = 0;
  let noCorrectCount = 0;

  for (const q of questions) {
    if (!q.options) {
      skippedCount++;
      continue;
    }

    const options = q.options as any[];
    const correctOpt = options.find(opt => opt.isCorrect);

    if (!correctOpt) {
      console.log(`⚠ Câu hỏi "${q.content.substring(0, 50)}..." KHÔNG CÓ đáp án đúng nào trong options!`);
      noCorrectCount++;
      continue;
    }

    // So sánh: nếu correctAnswer hiện tại KHÁC với opt.id của đáp án isCorrect → SỬA
    if (q.correctAnswer !== correctOpt.id) {
      console.log(`🔧 SỬA: "${q.content.substring(0, 50)}..." | Cũ: "${q.correctAnswer}" → Mới: "${correctOpt.id}" (${correctOpt.text})`);
      await prisma.question.update({
        where: { id: q.id },
        data: { correctAnswer: correctOpt.id }
      });
      fixedCount++;
    }
  }

  console.log(`\n=== KẾT QUẢ ===`);
  console.log(`Tổng câu hỏi MCQ: ${questions.length}`);
  console.log(`Đã sửa correctAnswer: ${fixedCount}`);
  console.log(`Không có options: ${skippedCount}`);
  console.log(`Không có đáp án đúng (isCorrect): ${noCorrectCount}`);
  console.log(`Đã đúng sẵn: ${questions.length - fixedCount - skippedCount - noCorrectCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

