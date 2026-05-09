import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    where: { questionType: 'MULTIPLE_CHOICE' }
  });

  let fixedCount = 0;
  let problemCount = 0;

  for (const q of questions) {
    if (!q.options) continue;
    const options = q.options as any[];
    const hasCorrectFlag = options.some(opt => opt.isCorrect === true);

    if (hasCorrectFlag) continue; // Skip already fixed

    problemCount++;

    if (!q.correctAnswer) {
      console.log(`⚠ NO correctAnswer: "${q.content.substring(0, 50)}..."`);
      continue;
    }

    // Check if correctAnswer is already an option ID
    const matchById = options.find(opt => opt.id === q.correctAnswer);
    if (matchById) {
      // correctAnswer matches an opt.id but isCorrect is not set → just set it
      const updatedOptions = options.map(opt => ({
        ...opt,
        isCorrect: opt.id === q.correctAnswer
      }));
      await prisma.question.update({
        where: { id: q.id },
        data: { options: updatedOptions }
      });
      console.log(`✅ ID MATCH: "${q.content.substring(0, 40)}..." → set isCorrect for "${matchById.text}"`);
      fixedCount++;
      continue;
    }

    // Try text match
    const matchByText = options.find(opt =>
      opt.text && opt.text.trim().toLowerCase() === q.correctAnswer!.trim().toLowerCase()
    );

    if (matchByText) {
      const updatedOptions = options.map(opt => ({
        ...opt,
        isCorrect: opt.id === matchByText.id
      }));
      await prisma.question.update({
        where: { id: q.id },
        data: { options: updatedOptions, correctAnswer: matchByText.id }
      });
      console.log(` TEXT MATCH: "${q.content.substring(0, 40)}..." → "${matchByText.text}"`);
      fixedCount++;
      continue;
    }

    // Try partial match (correctAnswer might have prefix like "A. ")
    const cleanCorrect = q.correctAnswer.replace(/^[A-Z]\.\s*/, '').trim().toLowerCase();
    const matchByClean = options.find(opt =>
      opt.text && opt.text.trim().toLowerCase() === cleanCorrect
    );

    if (matchByClean) {
      const updatedOptions = options.map(opt => ({
        ...opt,
        isCorrect: opt.id === matchByClean.id
      }));
      await prisma.question.update({
        where: { id: q.id },
        data: { options: updatedOptions, correctAnswer: matchByClean.id }
      });
      console.log(`✅ CLEAN MATCH: "${q.content.substring(0, 40)}..." → "${matchByClean.text}"`);
      fixedCount++;
      continue;
    }

    console.log(`\n❌ NO MATCH: "${q.content.substring(0, 50)}..."`);
    console.log(`   correctAnswer: "${q.correctAnswer}"`);
    console.log(`   options: ${JSON.stringify(options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })))}`);
  }

  console.log(`\n=== KẾT QUẢ ===`);
  console.log(`Tổng câu hỏi có vấn đề: ${problemCount}`);
  console.log(`Đã sửa: ${fixedCount}`);
  console.log(`Không sửa được: ${problemCount - fixedCount}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
