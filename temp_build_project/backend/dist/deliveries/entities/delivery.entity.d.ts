import { User } from '../../users/entities/user.entity';
export declare class Delivery {
    id: string;
    customer_id: string;
    driver_id: string;
    pickup_name: string;
    pickup_address: string;
    pickup_latitude: number;
    pickup_longitude: number;
    dropoff_name: string;
    dropoff_address: string;
    dropoff_latitude: number;
    dropoff_longitude: number;
    customer_name: string;
    customer_phone: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        notes: string | null;
    }>;
    total_amount: number;
    delivery_fee: number;
    status: string;
    estimated_distance: number;
    estimated_duration: string;
    delivery_instructions: string;
    created_at: Date;
    updated_at: Date;
    accepted_at: Date;
    picked_up_at: Date;
    delivered_at: Date;
    cancelled_at: Date;
    customer: User;
    driver: User;
}
