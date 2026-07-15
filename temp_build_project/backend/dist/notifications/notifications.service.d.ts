import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
export declare class NotificationsService {
    private readonly notificationRepo;
    constructor(notificationRepo: Repository<Notification>);
    create(dto: CreateNotificationDto): Promise<Notification>;
    findByUser(userId: string, page?: number, limit?: number): Promise<{
        notifications: Notification[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    markAsRead(notificationId: string): Promise<Notification | null>;
    markAllAsRead(userId: string): Promise<{
        message: string;
    }>;
    getUnreadCount(userId: string): Promise<number>;
}
