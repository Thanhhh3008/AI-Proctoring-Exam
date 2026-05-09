import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

// BƯỚC 1: IMPORT MAIL MODULE
import { MailModule } from '../shared/mail/mail.module'; 

@Module({
  imports: [
    // BƯỚC 2: KHAI BÁO MAIL MODULE VÀO ĐÂY
    MailModule,

    // Đăng ký module JWT
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // Token có hạn trong 1 ngày
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}