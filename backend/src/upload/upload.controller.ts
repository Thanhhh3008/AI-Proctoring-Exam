import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, parse } from 'path';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      // Xác định thư mục lưu trữ tệp tin
      destination: './uploads',
      filename: (req, file, callback) => {

        const fileInfo = parse(file.originalname);
        const originalName = fileInfo.name;


        const sanitizedName = originalName
          .replace(/\s+/g, '-') // Thay khoảng trắng bằng '-'
          .replace(/[^a-zA-Z0-9.\-_]/g, ''); // Chỉ giữ lại chữ, số, chấm, gạch ngang, gạch dưới


        const randomNum = Math.floor(1000 + Math.random() * 9000);


        const fileExtName = extname(file.originalname);


        const finalFileName = `${sanitizedName}_${randomNum}${fileExtName}`;

        callback(null, finalFileName);
      },
    }),
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Kiểm tra nếu không có file nào được gửi lên
    if (!file) {
      throw new BadRequestException('Không có file nào được tải lên!');
    }

    // Trả về thông tin tệp đã tải lên thành công, bao gồm đường dẫn truy cập
    return {
      message: 'Tải tệp lên thành công!',
      originalName: file.originalname,
      fileName: file.filename,
      url: `/uploads/${file.filename}`, // Đường dẫn để lưu vào CSDL hoặc truy cập
    };
  }
}