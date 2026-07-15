import { Trip } from './trip.entity';
import { User } from '../../users/entities/user.entity';
export declare class TripLocation {
    id: string;
    trip_id: string;
    driver_id: string;
    latitude: number;
    longitude: number;
    recorded_at: Date;
    trip: Trip;
    driver: User;
}
