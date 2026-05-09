import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { MailService } from '../shared/mail/mail.service';
import { PublicClassesController } from './public-classes.controller';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [
    
    JwtModule.register({}), 
  ],
  providers: [ClassesService, MailService],
  controllers: [ClassesController, PublicClassesController]
})
export class ClassesModule {}
