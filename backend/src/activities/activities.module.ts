import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';

import { PrismaService } from '../shared/prisma/prisma.service'; 

import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PrismaService],
})
export class ActivitiesModule {}