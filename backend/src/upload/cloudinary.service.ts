import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly useCloudinary: boolean;

  constructor() {
    // Chỉ dùng Cloudinary nếu cả 3 biến môi trường đều được cấu hình
    this.useCloudinary =
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET;

    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.logger.log('✅ Chế độ: Cloudinary (Production)');
    } else {
      this.logger.warn('⚠️  Chế độ: Local Disk (Development) - Cloudinary chưa được cấu hình');
    }
  }

  /**
   * Upload file:
   * - Có Cloudinary key → upload lên cloud, trả về URL https://
   * - Không có key     → lưu vào ./uploads/ local, trả về URL /uploads/...
   */
  async uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
    if (this.useCloudinary) {
      return this.uploadToCloudinary(buffer, folder);
    } else {
      return this.saveToLocalDisk(buffer, folder);
    }
  }

  // ===== CLOUDINARY =====
  private uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload thất bại'));
          resolve(result.secure_url);
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  // ===== LOCAL DISK (fallback khi chạy local) =====
  private saveToLocalDisk(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads', folder);
        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        resolve(`/uploads/${folder}/${filename}`);
      } catch (err) {
        reject(err);
      }
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    if (this.useCloudinary) {
      await cloudinary.uploader.destroy(publicId);
    }
    // Local: không cần xóa file tự động
  }
}
