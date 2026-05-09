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
        // Chú ý: Cần xử lý tên file gốc để đảm bảo an toàn (ví dụ: loại bỏ ký tự đặc biệt)
        // nhưng vẫn giữ nguyên "nội dung" tên file như yêu cầu.

        // 1. Sử dụng parse từ thư viện 'path' để tách tên tệp và phần mở rộng
        // Ví dụ: file.originalname = "abc.pdf"
        // parse(file.originalname).name = "abc"
        const fileInfo = parse(file.originalname);
        const originalName = fileInfo.name;

        // 2. Làm sạch tên file gốc (Tùy chọn nhưng khuyến nghị)
        // Thay thế khoảng trắng và các ký tự không an toàn bằng dấu gạch ngang
        const sanitizedName = originalName
          .replace(/\s+/g, '-') // Thay khoảng trắng bằng '-'
          .replace(/[^a-zA-Z0-9.\-_]/g, ''); // Chỉ giữ lại chữ, số, chấm, gạch ngang, gạch dưới

        // 3. Tạo 4 số ngẫu nhiên từ 1000 đến 9999
        // Math.random() sinh số từ 0 đến gần 1.
        // Nhân với 9000 và cộng 1000 đảm bảo kết quả nằm trong khoảng [1000, 9999].
        // Math.floor() để làm tròn xuống số nguyên.
        const randomNum = Math.floor(1000 + Math.random() * 9000);

        // 4. Lấy phần mở rộng của tệp gốc (ví dụ: ".pdf")
        const fileExtName = extname(file.originalname);

        // 5. Kết hợp các phần lại theo định dạng yêu cầu: tenfilegoc_xxxx.dinhdang
        // Ví dụ: abc_3212.pdf
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