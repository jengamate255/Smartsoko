import { User } from '../../users/entities/user.entity';
export declare class PaymentMethod {
    id: string;
    user_id: string;
    type: string;
    provider: string;
    identifier: string;
    is_default: boolean;
    is_active: boolean;
    created_at: Date;
    user: User;
}
