import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../shared/prisma/prisma.module'; 
import { MailModule } from '../shared/mail/mail.module';

@Module({
  imports: [PrismaModule , MailModule], 
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}