import { NotificationsService } from './notifications.service';
import { Request } from 'express';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(req: Request, page?: string, limit?: string): Promise<{
        notifications: import("./entities/notification.entity").Notification[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    unreadCount(req: Request): Promise<{
        count: number;
    }>;
    markAsRead(id: string): Promise<import("./entities/notification.entity").Notification | null>;
    markAllAsRead(req: Request): Promise<{
        message: string;
    }>;
}
