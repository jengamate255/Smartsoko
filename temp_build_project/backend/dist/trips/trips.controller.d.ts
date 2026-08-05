import { Repository } from 'typeorm';
import { TripsService } from './trips.service';
import { EstimateDto } from './dto/estimate.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { ServiceType } from './entities/service-type.entity';
import { Request } from 'express';
export declare class TripsController {
    private readonly tripsService;
    private readonly serviceTypeRepo;
    constructor(tripsService: TripsService, serviceTypeRepo: Repository<ServiceType>);
    getServiceTypes(): Promise<ServiceType[]>;
    estimate(dto: EstimateDto): Promise<{
        service_type: ServiceType;
        distance_km: number;
        duration_min: number;
        estimated_price: number;
    }>;
    create(req: Request, dto: CreateTripDto): Promise<import("./entities/trip.entity").Trip | null>;
    list(req: Request, page?: string, limit?: string): Promise<import("./entities/trip.entity").Trip[]>;
    getActive(req: Request): Promise<import("./entities/trip.entity").Trip | null>;
    getById(req: Request, id: string): Promise<import("./entities/trip.entity").Trip>;
    cancel(req: Request, id: string, dto: CancelTripDto): Promise<import("./entities/trip.entity").Trip | null>;
}
