import { User } from '../../users/entities/user.entity';
export declare class DriverAvailability {
    id: string;
    driver_id: string;
    is_online: boolean;
    latitude: number;
    longitude: number;
    vehicle_type: string;
    vehicle_color: string;
    vehicle_plate: string;
    is_on_trip: boolean;
    updated_at: Date;
    driver: User;
}
