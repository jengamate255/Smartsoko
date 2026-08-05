declare class DeliveryItem {
    name: string;
    quantity: number;
    price: number;
    notes?: string;
}
export declare class CreateDeliveryDto {
    pickup_name: string;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_name: string;
    dropoff_address: string;
    dropoff_lat: number;
    dropoff_lng: number;
    customer_name: string;
    customer_phone: string;
    items: DeliveryItem[];
    total_amount: number;
    delivery_fee?: number;
    estimated_distance?: number;
    estimated_duration?: string;
    delivery_instructions?: string;
}
export {};
