import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateDeliveryDto) {
    return this.deliveriesService.create(req.user!['id'], dto);
  }

  @Get('available')
  async available(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.deliveriesService.getAvailable(parseInt(page) || 1, parseInt(limit) || 20);
  }

  @Post(':id/accept')
  async accept(@Req() req: Request, @Param('id') id: string) {
    return this.deliveriesService.accept(id, req.user!['id']);
  }

  @Post(':id/reject')
  async reject(@Req() req: Request, @Param('id') id: string) {
    return this.deliveriesService.reject(id, req.user!['id']);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveriesService.updateStatus(id, req.user!['id'], dto);
  }

  @Get('active')
  async getActive(@Req() req: Request) {
    const active = await this.deliveriesService.getActive(req.user!['id']);
    return active || null;
  }

  @Get('history')
  async history(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.deliveriesService.getHistory(req.user!['id'], parseInt(page) || 1, parseInt(limit) || 20);
  }
}
