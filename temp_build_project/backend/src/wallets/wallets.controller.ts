import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('balance')
  async getBalance(@Req() req: Request) {
    return this.walletsService.getBalance(req.user!['id']);
  }

  @Post('deposit')
  async deposit(@Req() req: Request, @Body() dto: DepositDto) {
    return this.walletsService.deposit(req.user!['id'], dto);
  }

  @Post('withdraw')
  async withdraw(@Req() req: Request, @Body() dto: WithdrawDto) {
    return this.walletsService.withdraw(req.user!['id'], dto);
  }

  @Get('transactions')
  async getTransactions(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.walletsService.getTransactions(req.user!['id'], parseInt(page) || 1, parseInt(limit) || 20);
  }
}
