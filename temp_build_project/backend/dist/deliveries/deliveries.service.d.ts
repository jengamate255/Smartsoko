import { Repository } from 'typeorm';
import { Delivery } from './entities/delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
export declare class DeliveriesService {
    private readonly deliveryRepo;
    constructor(deliveryRepo: Repository<Delivery>);
    create(customerId: string, dto: CreateDeliveryDto): Promise<Delivery>;
    getAvailable(page?: number, limit?: number): Promise<{
        deliveries: Delivery[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    accept(deliveryId: string, driverId: string): Promise<Delivery>;
    reject(deliveryId: string, driverId: string): Promise<Delivery>;
    updateStatus(deliveryId: string, driverId: string, dto: UpdateDeliveryStatusDto): Promise<Delivery>;
    getActive(driverId: string): Promise<Delivery | null>;
    getHistory(driverId: string, page?: number, limit?: number): Promise<{
        deliveries: Delivery[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
