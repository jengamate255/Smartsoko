import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { Request } from 'express';
export declare class DeliveriesController {
    private readonly deliveriesService;
    constructor(deliveriesService: DeliveriesService);
    create(req: Request, dto: CreateDeliveryDto): Promise<import("./entities/delivery.entity").Delivery>;
    available(page?: string, limit?: string): Promise<{
        deliveries: import("./entities/delivery.entity").Delivery[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    accept(req: Request, id: string): Promise<import("./entities/delivery.entity").Delivery>;
    reject(req: Request, id: string): Promise<import("./entities/delivery.entity").Delivery>;
    updateStatus(req: Request, id: string, dto: UpdateDeliveryStatusDto): Promise<import("./entities/delivery.entity").Delivery>;
    getActive(req: Request): Promise<import("./entities/delivery.entity").Delivery | null>;
    history(req: Request, page?: string, limit?: string): Promise<{
        deliveries: import("./entities/delivery.entity").Delivery[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
