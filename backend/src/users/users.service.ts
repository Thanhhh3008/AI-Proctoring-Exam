import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Cập nhật Profile (Tên & Ảnh)
  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  // 2. Đổi mật khẩu (Đã sửa lỗi Object possibly 'null')
  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // KIỂM TRA NẾU KHÔNG TÌM THẤY USER
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    
    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    // Băm mật khẩu mới
    const newHash = await bcrypt.hash(dto.newPassword, 10);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }
  // Thêm hàm này vào UsersService
async getUserInfo(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      email: true, 
      fullName: true, 
      avatarUrl: true, 
      role: true,
      baseFaceUrl: true,
      facePhotoVerified: true,
    }
  });

  if (!user) throw new NotFoundException('Không tìm thấy người dùng');
  return user;
}

  // Cập nhật ảnh chân dung - đặt lại trạng thái chờ duyệt
  async updateFacePhoto(userId: string, facePhotoUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        baseFaceUrl: facePhotoUrl,
        facePhotoVerified: false, // Đặt lại trạng thái chờ admin xác nhận
      },
      select: { id: true, baseFaceUrl: true, facePhotoVerified: true },
    });
  }

  // Admin xác nhận hoặc từ chối ảnh chân dung
  async approveFacePhoto(userId: string, approved: boolean) {
    const data: any = { facePhotoVerified: approved };
    if (!approved) {
      data.baseFaceUrl = null; // Xoá ảnh nếu bị từ chối
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, fullName: true, baseFaceUrl: true, facePhotoVerified: true },
    });
  }

  // 3. Lấy tất cả người dùng (Cho Admin)
  async findAll(query: { search?: string; role?: string; pendingFace?: string }) {
    const where: any = {};
    
    if (query.role) {
      where.role = query.role;
    }
    
    if (query.pendingFace === 'true') {
      where.baseFaceUrl = { not: null };
      where.facePhotoVerified = false;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        baseFaceUrl: true,
        facePhotoVerified: true,
        createdAt: true,
        isVerified: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 4. Xóa người dùng
  async remove(id: string) {
    // Không cho phép tự xóa chính mình hoặc xóa admin (tùy chính sách, ở đây mình cho xóa nếu đúng id)
    return this.prisma.user.delete({
      where: { id },
    });
  }
}