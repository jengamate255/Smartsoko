import { User } from '../../users/entities/user.entity';
export declare class Notification {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: string;
    reference_id: string;
    is_read: boolean;
    created_at: Date;
    user: User;
}
