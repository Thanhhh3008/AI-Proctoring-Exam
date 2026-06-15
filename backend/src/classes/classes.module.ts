import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { MailService } from '../shared/mail/mail.service';
import { PublicClassesController } from './public-classes.controller';
import { JwtModule } from '@nestjs/jwt';
import { UploadModule } from '../upload/upload.module';
@Module({
  imports: [
    JwtModule.register({}),
    UploadModule,
  ],
  providers: [ClassesService, MailService],
  controllers: [ClassesController, PublicClassesController]
})
export class ClassesModule {}
