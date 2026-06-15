import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload buffer (từ Multer memoryStorage) lên Cloudinary
   * @param buffer - File buffer từ Multer
   * @param folder - Thư mục trên Cloudinary (vd: 'avatars', 'face-photos')
   * @returns URL công khai của ảnh
   */
  async uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Xóa file trên Cloudinary theo public_id
   */
  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
