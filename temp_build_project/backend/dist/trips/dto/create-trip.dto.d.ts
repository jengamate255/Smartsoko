export declare class CreateTripDto {
    service_type_id: string;
    pickup_lat: number;
    pickup_lng: number;
    pickup_address: string;
    dropoff_lat: number;
    dropoff_lng: number;
    dropoff_address: string;
    payment_method?: string;
}
