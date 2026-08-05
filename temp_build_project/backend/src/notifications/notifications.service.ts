import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = this.notificationRepo.create({
      user_id: dto.user_id,
      title: dto.title,
      body: dto.body,
      type: dto.type || 'general',
      reference_id: dto.reference_id,
    });
    return this.notificationRepo.save(notification);
  }

  async findByUser(userId: string, page: number = 1, limit: number = 20) {
    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(notificationId: string) {
    const notification = await this.notificationRepo.findOne({ where: { id: notificationId } });
    if (notification) {
      notification.is_read = true;
      await this.notificationRepo.save(notification);
    }
    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update({ user_id: userId, is_read: false }, { is_read: true });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepo.count({ where: { user_id: userId, is_read: false } });
  }
}
