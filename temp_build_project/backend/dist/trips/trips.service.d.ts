import { Repository } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { ServiceType } from './entities/service-type.entity';
import { TripLocation } from './entities/trip-location.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { EstimateDto } from './dto/estimate.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
export declare class TripsService {
    private readonly tripRepo;
    private readonly serviceTypeRepo;
    private readonly tripLocationRepo;
    private readonly userRepo;
    private readonly notificationRepo;
    private readonly walletRepo;
    private readonly transactionRepo;
    constructor(tripRepo: Repository<Trip>, serviceTypeRepo: Repository<ServiceType>, tripLocationRepo: Repository<TripLocation>, userRepo: Repository<User>, notificationRepo: Repository<Notification>, walletRepo: Repository<Wallet>, transactionRepo: Repository<Transaction>);
    estimatePrice(dto: EstimateDto): Promise<{
        service_type: ServiceType;
        distance_km: number;
        duration_min: number;
        estimated_price: number;
    }>;
    createTrip(customerId: string, dto: CreateTripDto): Promise<Trip | null>;
    getTripById(tripId: string, userId: string): Promise<Trip>;
    getCustomerTrips(customerId: string, page?: number, limit?: number): Promise<Trip[]>;
    getActiveTrip(customerId: string): Promise<Trip | null>;
    cancelTrip(tripId: string, userId: string, dto: CancelTripDto): Promise<Trip | null>;
    private calculateDistance;
    private toRad;
}
