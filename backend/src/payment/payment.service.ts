import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { MailService } from '../shared/mail/mail.service'; 
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import * as querystring from 'querystring';
@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // 1. TẠO URL THANH TOÁN MOMO
  async createMomoPayment(studentId: string, classId: string) {
    const course = await this.prisma.class.findUnique({ 
      where: { id: classId }, 
      include: { subject: true } 
    });
    
    if (!course) throw new BadRequestException('Khóa học không tồn tại');
    if (course.price <= 0) throw new BadRequestException('Khóa học này miễn phí');

    const partnerCode = "MOMO";
    const accessKey = "F8BBA842ECF85";
    const secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    
    // const partnerCode = "MOMOBKUN20180529";
    // const accessKey = "klm05TvNBzhg7h7j";
    // const secretkey = "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";

    const domainFrontend = this.configService.get<string>('DOMAIN_FRONTEND') || 'http://localhost:5173';
    const domainBackend = this.configService.get<string>('DOMAIN_BACKEND') || 'http://localhost:3000';

    const orderId = `${partnerCode}${new Date().getTime()}`;
    const requestId = orderId;
    const amount = course.price.toString();
    const orderInfo = `Thanh toán khóa học ${course.subject.name}`;
    const redirectUrl = `${domainFrontend}/payment/result`; 
    const ipnUrl = `${domainBackend}/payment/webhook`; 
    const requestType = "payWithMethod"; //"payWithMethod"
   
    const extraData = ""; 

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const signature = crypto.createHmac('sha256', secretkey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode, accessKey, requestId, amount, orderId, orderInfo,
      redirectUrl, ipnUrl, extraData, requestType, signature, lang: 'vi'
    };

    try {
      await this.prisma.payment.create({
        data: { 
          orderId, 
          studentId, 
          classId, 
          amount: course.price, 
          status: 'PENDING' 
        }
      });

      const result = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody);
      return { payUrl: result.data.payUrl };

    } catch (error) {
      console.error("Lỗi tạo thanh toán MoMo:", error.response?.data || error.message);
      throw new BadRequestException('Lỗi hệ thống khi tạo thanh toán MoMo');
    }
  }

  // HÀM DÙNG CHUNG ĐỂ XỬ LÝ GIAO DỊCH THÀNH CÔNG VÀ CHỈ GỬI MAIL 1 LẦN
 
  private async processSuccessfulPayment(paymentId: string, orderId: string, transId: string) {
    let shouldSendEmail = false;
    let paymentDataForEmail: any = null;

    // 1. Cập nhật Database nhanh chóng và an toàn (chống Race Condition)
    await this.prisma.$transaction(async (prisma) => {
      // Sử dụng updateMany với điều kiện status = 'PENDING' để đảm bảo chỉ có 1 luồng update thành công
      const updateResult = await prisma.payment.updateMany({ 
        where: { id: paymentId, status: 'PENDING' }, 
        data: { status: 'SUCCESS' } 
      });

      // Nếu count === 0 nghĩa là luồng khác (Webhook hoặc Frontend) đã xử lý trước đó rồi
      if (updateResult.count === 0) {
        return; 
      }

      const currentPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { student: true, class: { include: { subject: true } } }
      });

      if (!currentPayment) return;

      const exists = await prisma.classStudent.findUnique({
        where: { classId_studentId: { classId: currentPayment.classId, studentId: currentPayment.studentId } }
      });
      
      if (!exists) {
        await prisma.classStudent.create({ 
          data: { classId: currentPayment.classId, studentId: currentPayment.studentId } 
        });
      }

      // Đánh dấu là cần gửi email và lưu lại data để gửi
      shouldSendEmail = true;
      paymentDataForEmail = currentPayment;
      
    }); 

    // 2. Gửi Email CHẬM (Nằm ngoài Transaction để không gây lỗi Timeout)
    if (shouldSendEmail && paymentDataForEmail) {
      try {
        await this.sendInvoiceEmail(
          paymentDataForEmail.student.email, 
          paymentDataForEmail.student.fullName, 
          paymentDataForEmail.class.subject.name, 
          paymentDataForEmail.amount, 
          orderId,
          transId.toString()
        );
      } catch (emailError) {
        console.error("Lỗi khi gửi email hóa đơn (nhưng DB đã update thành công):", emailError);
        // Không throw lỗi ở đây để Frontend vẫn nhận được chữ "Thanh toán thành công"
      }
    }

    return true;
  }

  // 2. XỬ LÝ KẾT QUẢ TỪ MOMO WEBHOOK (IPN)
  async handleMomoWebhook(body: any) {
    const { orderId, resultCode, transId } = body;

    const payment = await this.prisma.payment.findUnique({ where: { orderId } });

    if (!payment || payment.status !== 'PENDING') {
      return { message: 'Giao dịch đã xử lý hoặc không tồn tại' };
    }

    if (resultCode === 0) { 
      await this.processSuccessfulPayment(payment.id, orderId, transId);
    } else { 
      await this.prisma.payment.update({ 
        where: { id: payment.id }, 
        data: { status: 'FAILED' } 
      });
    }

    return { message: 'Nhận IPN thành công' };
  }

  // 3. KIỂM TRA TRẠNG THÁI GIAO DỊCH TRỰC TIẾP TỪ MOMO SERVER (Frontend gọi)
 
  async checkAndProcessPayment(orderId: string, resultCodeFromUrl: string, transIdFromUrl: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });

    if (!payment) throw new BadRequestException('Không tìm thấy giao dịch');
    console.log({
  resultCodeFromUrl,
  
});
    // Nếu Webhook đã chạy trước và xử lý xong rồi thì báo luôn thành công
    if (payment.status === 'SUCCESS') return { success: true, message: 'Đã thanh toán' };
    if (payment.status === 'FAILED') return { success: false, message: 'Thanh toán thất bại' };

    // Thay vì gọi API Query, ta tin tưởng resultCode truyền từ URL (Cho môi trường Sandbox)
    // Trong thực tế (Production), bạn NÊN dùng Webhook hoặc Query API.
    if (resultCodeFromUrl === '0') { 
      // Xử lý thành công
      await this.processSuccessfulPayment(payment.id, orderId, transIdFromUrl || 'MOMO_SANDBOX_TRANS');
      return { success: true, message: 'Thanh toán thành công' };
    } else {
      // Cập nhật Database thành FAILED
      await this.prisma.payment.update({ 
        where: { id: payment.id }, 
        data: { status: 'FAILED' } 
      });
      throw new BadRequestException('Thanh toán thất bại từ phía MoMo');
    }
    
  }

  // 4. HÀM GỬI EMAIL HÓA ĐƠN (GIAO DIỆN MỚI)
  private async sendInvoiceEmail(email: string, name: string, courseName: string, amount: number, orderId: string, transId: string) {
    const subject = `[EduExam] Biên lai thanh toán khóa học: ${courseName}`;
    const paymentDate = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        
        <div style="background-color: #2563eb; padding: 30px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">EduExam</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Biên lai thanh toán điện tử</p>
        </div>

        <div style="padding: 30px 20px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Xin chào ${name},</h2>
          <p style="font-size: 15px; line-height: 1.6;">Cảm ơn bạn đã tin tưởng và đăng ký khóa học tại hệ thống EduExam. Giao dịch thanh toán của bạn đã được xử lý thành công.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Chi tiết đơn hàng</h3>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Khóa học:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Mã đơn hàng (Order ID):</td>
                <td style="padding: 8px 0; text-align: right; color: #111827;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Mã giao dịch MoMo:</td>
                <td style="padding: 8px 0; text-align: right; color: #111827;">${transId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Thời gian thanh toán:</td>
                <td style="padding: 8px 0; text-align: right; color: #111827;">${paymentDate}</td>
              </tr>
              <tr>
                <td colspan="2" style="border-bottom: 1px dashed #cbd5e1; padding-top: 10px;"></td>
              </tr>
              <tr>
                <td style="padding: 15px 0 0 0; font-size: 16px; font-weight: bold; color: #1e293b;">Tổng thanh toán:</td>
                <td style="padding: 15px 0 0 0; text-align: right; font-size: 18px; font-weight: bold; color: #10b981;">${amount.toLocaleString('vi-VN')} VNĐ</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 15px; line-height: 1.6;">Tài khoản của bạn đã được tự động cấp quyền truy cập vào lớp học. Vui lòng truy cập vào hệ thống và chọn mục <strong>"Các lớp học của tôi"</strong> để bắt đầu học ngay.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 12px 25px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Đến lớp học ngay</a>
          </div>
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b;">
          <p style="margin: 0 0 10px 0;">Nếu bạn cần hỗ trợ, vui lòng liên hệ chúng tôi qua email: support@eduexam.vn</p>
          <p style="margin: 0;">© ${new Date().getFullYear()} EduExam LMS. All rights reserved.</p>
        </div>

      </div>
    `;
    
    await this.mailService.sendMail(email, subject, html);
  }
}