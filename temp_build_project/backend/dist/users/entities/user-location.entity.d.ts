import { User } from './user.entity';
export declare class UserLocation {
    id: string;
    user_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_favorite: boolean;
    created_at: Date;
    user: User;
}
