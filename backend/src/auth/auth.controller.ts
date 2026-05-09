import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '../common/dto/register.dto';
import { LoginDto } from '../common/dto/login.dto';
import  type { Response } from 'express'; // Import Response của Express để dùng cho @Res()

@Controller('auth') 
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // http://localhost:3000/auth/register
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Get('verify') // http://localhost:3000/auth/verify?token=...
  async verify(@Query('token') token: string, @Res() res: Response) {
    const result = await this.authService.verifyEmail(token);
    // Khi xác thực thành công, tự động chuyển hướng trình duyệt về trang Đăng nhập của React
    return res.redirect(result.url);
  }

  @Post('login') // http://localhost:3000/auth/login
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyResetOtp(body.email, body.otp);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.otp, body.newPassword);
  }
}