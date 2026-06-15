import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { memoryStorage } from 'multer';

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), // Giữ file trong RAM, không lưu disk
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không có file nào được tải lên!');
    }

    const url = await this.cloudinaryService.uploadBuffer(file.buffer, 'uploads');

    return {
      message: 'Tải tệp lên thành công!',
      originalName: file.originalname,
      url,
    };
  }
}