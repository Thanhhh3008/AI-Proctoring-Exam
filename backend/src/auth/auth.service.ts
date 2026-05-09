import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { RegisterDto } from '../common/dto/register.dto';
import { LoginDto } from '../common/dto/login.dto'; 
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt'; 
import { v4 as uuidv4 } from 'uuid'; 

// IMPORT MAIL SERVICE VÀO ĐÂY ĐỂ DÙNG CHUNG
import { MailService } from '../shared/mail/mail.service'; 

@Injectable()
export class AuthService {

  // SỬ DỤNG DEPENDENCY INJECTION CỦA NESTJS ĐỂ GỌI MAIL SERVICE
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService // Inject MailService
  ) {}

  // ==========================================
  // 1. ĐĂNG KÝ (Có xác thực Email & Phân quyền)
  // ==========================================
  async register(dto: RegisterDto) {
    try {
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,16}$/;
      if (!passwordRegex.test(dto.password)) {
        throw new BadRequestException('Mật khẩu phải dài từ 8-16 ký tự và bao gồm cả chữ cái và chữ số!');
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email này đã được đăng ký! Vui lòng sử dụng email khác.');
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
      const verifyToken = uuidv4();

      const newUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: hashedPassword,
          fullName: dto.fullName,
          role: dto.role || 'STUDENT', 
          isVerified: false,
          verificationToken: verifyToken,
        },
      });

      const verifyLink = `http://localhost:3000/auth/verify?token=${verifyToken}`;
      
      // SỬ DỤNG MAIL SERVICE ĐỂ GỬI MAIL
      const subject = 'Xác nhận đăng ký tài khoản EduExam';
      const html = `
        <h2>Chào ${newUser.fullName},</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản trên hệ thống EduExam.</p>
        <p>Vui lòng click vào nút bên dưới để xác thực địa chỉ email và kích hoạt tài khoản của bạn (Vai trò: ${newUser.role}):</p>
        <a href="${verifyLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
          Xác nhận Email
        </a>
      `;

      await this.mailService.sendMail(newUser.email, subject, html);

      return {
        message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác nhận.',
      };

    } catch (error: any) {
      console.error("LỖI CHI TIẾT TỪ BACKEND:", error);
      if (error.code === 'P2002') {
        const targetField = error.meta?.target?.[0] || 'dữ liệu';
        throw new BadRequestException(`Đăng ký thất bại: Trường '${targetField}' này đã tồn tại trong hệ thống!`);
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Hệ thống đang bận hoặc có lỗi xảy ra. Vui lòng thử lại sau!');
    }
  }

  // ==========================================
  // 2. XÁC THỰC EMAIL KHI NGƯỜI DÙNG CLICK LINK
  // ==========================================
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn!');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null, 
      },
    });

    return { url: 'http://localhost:5173/login?verified=true' };
  }

  // ==========================================
  // 3. ĐĂNG NHẬP
  // ==========================================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng!');
    }

    const isPasswordMatched = await bcrypt.compare(dto.password, user.passwordHash);
    
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng!');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Tài khoản của bạn chưa được xác thực! Vui lòng kiểm tra email để kích hoạt tài khoản.');
    }

    const payload = {
      sub: user.id, 
      email: user.email,
      role: user.role, 
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Đăng nhập thành công!',
      accessToken: accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        baseFaceUrl: user.baseFaceUrl 
      }
    };
  }

  // =========================================================================
  // =========================================================================
  // CHỨC NĂNG QUÊN MẬT KHẨU (FORGOT PASSWORD FLOW)


  // BƯỚC 1: KIỂM TRA EMAIL VÀ GỬI MÃ OTP
  async forgotPassword(email: string) {
    // 1. Kiểm tra xem user có tồn tại không
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Email này chưa được đăng ký trong hệ thống!');
    }

    // 2. Tạo mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

    // 3. Lưu vào DB (Ghi đè nếu đã có yêu cầu trước đó)
    await this.prisma.passwordReset.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt },
    });

    // 4. Gửi email thông qua MailService
    await this.mailService.sendPasswordResetOtp(email, otp);

    return { message: 'Đã gửi mã xác nhận đến email của bạn!' };
  }

  // BƯỚC 2: XÁC THỰC MÃ OTP
  async verifyResetOtp(email: string, otp: string) {
    const record = await this.prisma.passwordReset.findUnique({
      where: { email },
    });

    if (!record) {
      throw new BadRequestException('Không tìm thấy yêu cầu khôi phục cho email này!');
    }

    if (record.otp !== otp) {
      throw new BadRequestException('Mã xác nhận (OTP) không chính xác!');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Mã xác nhận đã hết hạn! Vui lòng yêu cầu gửi lại mã.');
    }

    return { message: 'Xác thực OTP thành công!', valid: true };
  }

  // BƯỚC 3: CẬP NHẬT MẬT KHẨU MỚI
  async resetPassword(email: string, otp: string, newPassword: string) {
    // 1. Xác thực lại OTP một lần nữa để bảo mật tuyệt đối
    await this.verifyResetOtp(email, otp);

    // 2. Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Cập nhật mật khẩu vào bảng User
    await this.prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword }, // Đảm bảo tên trường đúng với CSDL của bạn (passwordHash)
    });

    // 4. Xóa record OTP đi để mã không bị tái sử dụng
    await this.prisma.passwordReset.delete({
      where: { email },
    });

    return { message: 'Đổi mật khẩu thành công!' };
  }
}