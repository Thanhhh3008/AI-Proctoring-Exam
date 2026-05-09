import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; 

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // API do Frontend React gọi (Yêu cầu đăng nhập)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createPayment(@Req() req, @Body('classId') classId: string) {
    // Lấy ID người dùng từ Token JWT
    const studentId = req.user.id || req.user.userId || req.user.sub;
    return this.paymentService.createMomoPayment(studentId, classId);
  }


  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    console.log("MoMo Webhook Received Data:", body);
    return this.paymentService.handleMomoWebhook(body);
  }


  @UseGuards(JwtAuthGuard)
  @Post('check-status')
  async checkPaymentStatus(
    @Req() req, 
    @Body('orderId') orderId: string,
    @Body('resultCode') resultCode: string, 
    @Body('transId') transId: string       
  ) {
    return this.paymentService.checkAndProcessPayment(orderId, resultCode, transId);
  }
}