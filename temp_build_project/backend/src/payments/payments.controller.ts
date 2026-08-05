import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  async processPayment(@Req() req: Request, @Body() dto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(req.user!['id'], dto);
  }

  @Post('refund')
  async refundPayment(@Req() req: Request, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(req.user!['id'], dto);
  }

  @Get('methods')
  async getPaymentMethods(@Req() req: Request) {
    return this.paymentsService.getPaymentMethods(req.user!['id']);
  }

  @Post('methods')
  async addPaymentMethod(@Req() req: Request, @Body() dto: AddPaymentMethodDto) {
    return this.paymentsService.addPaymentMethod(req.user!['id'], dto);
  }
}
