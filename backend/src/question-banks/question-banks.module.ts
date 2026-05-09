//question-banks.module.ts
import { Module } from '@nestjs/common';
import { QuestionBanksService } from './question-banks.service';
import { QuestionBanksController } from './question-banks.controller';
import { PrismaModule } from '../shared/prisma/prisma.module'; 

@Module({
  imports: [PrismaModule],
  controllers: [QuestionBanksController],
  providers: [QuestionBanksService],
})
export class QuestionBanksModule {}