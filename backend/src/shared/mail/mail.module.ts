import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // Thêm Global để không cần import lại ở nhiều nơi
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}