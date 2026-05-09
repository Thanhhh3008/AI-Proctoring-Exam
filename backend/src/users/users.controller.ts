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
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    // Gọi thông qua Service
    return this.usersService.getUserInfo(userId);
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        // Đã chỉnh về ./uploads để khớp với express.static của bạn
        destination: './uploads/avatars', 
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Chỉ chấp nhận file ảnh!'), false);
        }
        cb(null, true);
      },
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
      // Trả về /uploads/... để khớp với router tĩnh
      data.avatarUrl = `/uploads/avatars/${file.filename}`;
    }
    return this.usersService.updateProfile(userId, data);
  }

  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: any) {
    const userId = req.user.id || req.user.userId || req.user.sub;
    return this.usersService.changePassword(userId, dto);
  }

  // --- ADMIN ENDPOINTS ---

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async findAll(@Query() query: { search?: string; role?: string }) {
    return this.usersService.findAll(query);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}