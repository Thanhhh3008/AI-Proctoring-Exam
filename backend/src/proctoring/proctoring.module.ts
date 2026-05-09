import { Module } from '@nestjs/common';
import { ProctoringGateway } from './proctoring.gateway';
import { ProctoringService } from './proctoring.service';
import { ProctoringController } from './proctoring.controller';
import { AdminProctoringController } from './admin-proctoring.controller';

@Module({
  controllers: [ProctoringController, AdminProctoringController],
  providers: [ProctoringGateway, ProctoringService],
  exports: [ProctoringService],
})
export class ProctoringModule {}
