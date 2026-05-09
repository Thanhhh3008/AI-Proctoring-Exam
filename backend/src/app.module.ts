import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './shared/mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { CourseContentModule } from './course-content/course-content.module';
import { SubjectsModule } from './subjects/subjects.module';

import { ActivitiesModule } from './activities/activities.module';
import { UploadModule } from './upload/upload.module';
import { QuestionBanksModule } from './question-banks/question-banks.module';
import { PaymentModule } from './payment/payment.module';

import { ExamsModule } from './exams/exams.module';
import { ProctoringModule } from './proctoring/proctoring.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    CourseContentModule,
    SubjectsModule,
    ActivitiesModule,
    UploadModule,
    QuestionBanksModule,
    PaymentModule,
    ExamsModule,
    ProctoringModule,
    SettingsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
