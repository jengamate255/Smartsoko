import { Trip } from './trip.entity';
export declare class ServiceType {
    id: string;
    name: string;
    description: string;
    icon_url: string;
    base_fare: number;
    per_km_rate: number;
    per_min_rate: number;
    min_fare: number;
    cancellation_fee: number;
    capacity: number;
    is_active: boolean;
    created_at: Date;
    trips: Trip[];
}
