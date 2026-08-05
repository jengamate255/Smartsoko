import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.notificationsService.findByUser(req.user!['id'], parseInt(page) || 1, parseInt(limit) || 20);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request) {
    return { count: await this.notificationsService.getUnreadCount(req.user!['id']) };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    return this.notificationsService.markAllAsRead(req.user!['id']);
  }
}
