import { User } from '../../users/entities/user.entity';
export declare class RefreshToken {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    created_at: Date;
    user: User;
}
