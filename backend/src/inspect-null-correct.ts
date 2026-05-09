import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    where: { questionType: 'MULTIPLE_CHOICE' }
  });

  const nullCorrects = questions.filter(q => {
    if (!q.options) return false;
    const hasCorrectFlag = (q.options as any[]).some(opt => opt.isCorrect === true);
    return !hasCorrectFlag && !q.correctAnswer;
  });

  console.log(`Found ${nullCorrects.length} questions with no correctAnswer AND no isCorrect in options.`);
  if (nullCorrects.length > 0) {
    console.log("Example 3 questions:");
    for (const q of nullCorrects.slice(0, 3)) {
      console.log(`- ID: ${q.id}`);
      console.log(`  Content: ${q.content}`);
      console.log(`  Options:`, JSON.stringify(q.options, null, 2));
      console.log(`  Created At: ${q.createdAt}`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
