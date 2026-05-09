//backend/src/shared/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 1. Import ConfigService
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  // 2. Inject ConfigService vào constructor
  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        // 3. Lấy biến môi trường thông qua ConfigService thay vì process.env
        user: this.configService.get<string>('EMAIL_USER'), 
        pass: this.configService.get<string>('EMAIL_PASS'), 
      },
    });
  }

  // Hàm gửi mail 
  async sendMail(to: string, subject: string, html: string) {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    
    const mailOptions = {
      from: `"EduExam LMS" <${emailUser || 'no-reply@eduexam.vn'}>`,
      to,
      subject,
      html,
    };
    try {
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Lỗi gửi mail:', error);
      throw error; // Nên throw error ra để Auth Service biết mà báo lỗi cho người dùng
    }
  }

  // Gửi mã OTP Quên mật khẩu
  async sendPasswordResetOtp(to: string, otp: string) {
    const subject = 'Mã xác nhận khôi phục mật khẩu - EduExam LMS';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Khôi phục mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản EduExam LMS. Đây là mã xác nhận (OTP) của bạn:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px; text-align: center; max-width: 400px;">
          <b style="font-size: 32px; letter-spacing: 5px; color: #1d4ed8;">${otp}</b>
        </div>
        <p style="color: #dc2626; font-weight: bold;">Mã này chỉ có hiệu lực trong vòng 5 phút.</p>
        <p>Vui lòng không chia sẻ mã này cho bất kỳ ai. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
        <br/>
        <p>Trân trọng,<br/>Đội ngũ EduExam LMS</p>
      </div>
    `;
    
    return this.sendMail(to, subject, html);
  }
}