import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { 
  Controller, Patch, Post, Body, UseGuards, Request, Get,
  UseInterceptors, UploadedFile, BadRequestException, Query, Param, Delete 
} from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../upload/cloudinary.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  async getMe(@Request() req) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.usersService.getUserInfo(userId);
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Chỉ chấp nhận file ảnh!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async updateProfile(
    @Request() req, 
    @Body() body: { fullName?: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    const userId = req.user.id || req.user.userId || req.user.sub; 
    const data: any = { fullName: body.fullName };
    
    if (file) {
      // Upload lên Cloudinary, lấy URL thật
      data.avatarUrl = await this.cloudinaryService.uploadBuffer(file.buffer, 'avatars');
    }
    return this.usersService.updateProfile(userId, data);
  }

  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: any) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.usersService.changePassword(userId, dto);
  }

  // --- UPLOAD ẢNH CHÂN DUNG (ảnh XÁC THỰC KHUÔN MẶT) ---
  @Post('face-photo')
  @UseInterceptors(
    FileInterceptor('facePhoto', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Chỉ chấp nhận file ảnh JPG, JPEG, PNG!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadFacePhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Định kèm ảnh chân dung!');
    const userId = req.user.id || req.user.userId || req.user.sub;
    // Upload lên Cloudinary, lấy URL thật
    const facePhotoUrl = await this.cloudinaryService.uploadBuffer(file.buffer, 'face-photos');
    return this.usersService.updateFacePhoto(userId, facePhotoUrl);
  }

  // --- ADMIN: DUYỆT ẢNH CHÂN DUNG ---
  @Patch(':id/approve-face')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async approveFacePhoto(
    @Param('id') id: string,
    @Body() body: { approved: boolean; reason?: string },
  ) {
    return this.usersService.approveFacePhoto(id, body.approved);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async findAll(@Query() query: { search?: string; role?: string; pendingFace?: string }) {
    return this.usersService.findAll(query);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}