"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const trip_entity_1 = require("./entities/trip.entity");
const service_type_entity_1 = require("./entities/service-type.entity");
const trip_location_entity_1 = require("./entities/trip-location.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const wallet_entity_1 = require("../wallets/entities/wallet.entity");
const transaction_entity_1 = require("../wallets/entities/transaction.entity");
let TripsService = class TripsService {
    constructor(tripRepo, serviceTypeRepo, tripLocationRepo, userRepo, notificationRepo, walletRepo, transactionRepo) {
        this.tripRepo = tripRepo;
        this.serviceTypeRepo = serviceTypeRepo;
        this.tripLocationRepo = tripLocationRepo;
        this.userRepo = userRepo;
        this.notificationRepo = notificationRepo;
        this.walletRepo = walletRepo;
        this.transactionRepo = transactionRepo;
    }
    async estimatePrice(dto) {
        const serviceType = await this.serviceTypeRepo.findOne({ where: { id: dto.service_type_id, is_active: true } });
        if (!serviceType) {
            throw new common_1.NotFoundException('Service type not found');
        }
        const distance = this.calculateDistance(dto.pickup_lat, dto.pickup_lng, dto.dropoff_lat, dto.dropoff_lng);
        const duration = Math.round(distance / 40 * 60);
        const price = serviceType.base_fare
            + serviceType.per_km_rate * distance
            + serviceType.per_min_rate * duration;
        const finalPrice = Math.max(price, serviceType.min_fare);
        return {
            service_type: serviceType,
            distance_km: Math.round(distance * 100) / 100,
            duration_min: duration,
            estimated_price: Math.round(finalPrice * 100) / 100,
        };
    }
    async createTrip(customerId, dto) {
        const serviceType = await this.serviceTypeRepo.findOne({ where: { id: dto.service_type_id, is_active: true } });
        if (!serviceType) {
            throw new common_1.NotFoundException('Service type not found');
        }
        const estimate = await this.estimatePrice({
            service_type_id: dto.service_type_id,
            pickup_lat: dto.pickup_lat,
            pickup_lng: dto.pickup_lng,
            dropoff_lat: dto.dropoff_lat,
            dropoff_lng: dto.dropoff_lng,
        });
        const trip = this.tripRepo.create({
            customer_id: customerId,
            service_type_id: dto.service_type_id,
            status: 'requested',
            pickup_latitude: dto.pickup_lat,
            pickup_longitude: dto.pickup_lng,
            dropoff_latitude: dto.dropoff_lat,
            dropoff_longitude: dto.dropoff_lng,
            pickup_address: dto.pickup_address,
            dropoff_address: dto.dropoff_address,
            estimated_price: estimate.estimated_price,
            distance_km: estimate.distance_km,
            duration_min: estimate.duration_min,
            payment_method: dto.payment_method || 'cash',
            payment_status: 'pending',
        });
        const saved = await this.tripRepo.save(trip);
        await this.notificationRepo.save(this.notificationRepo.create({
            user_id: customerId,
            title: 'Trip Created',
            body: `Your trip has been requested. Estimated price: $${estimate.estimated_price}`,
            type: 'trip',
            reference_id: saved.id,
        }));
        return this.tripRepo.findOne({ where: { id: saved.id }, relations: ['service_type'] });
    }
    async getTripById(tripId, userId) {
        const trip = await this.tripRepo.findOne({
            where: { id: tripId },
            relations: ['service_type', 'customer', 'driver'],
        });
        if (!trip) {
            throw new common_1.NotFoundException('Trip not found');
        }
        if (trip.customer_id !== userId && trip.driver_id !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this trip');
        }
        return trip;
    }
    async getCustomerTrips(customerId, page = 1, limit = 20) {
        const [trips, total] = await this.tripRepo.findAndCount({
            where: { customer_id: customerId },
            relations: ['service_type', 'driver'],
            order: { requested_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return trips;
    }
    async getActiveTrip(customerId) {
        return this.tripRepo.findOne({
            where: { customer_id: customerId, status: 'requested' },
            relations: ['service_type', 'driver'],
            order: { requested_at: 'DESC' },
        });
    }
    async cancelTrip(tripId, userId, dto) {
        const trip = await this.tripRepo.findOne({ where: { id: tripId } });
        if (!trip) {
            throw new common_1.NotFoundException('Trip not found');
        }
        if (trip.customer_id !== userId) {
            throw new common_1.ForbiddenException('Only the customer can cancel this trip');
        }
        if (!['requested', 'accepted'].includes(trip.status)) {
            throw new common_1.BadRequestException('Trip cannot be cancelled at current status');
        }
        trip.status = 'cancelled';
        trip.cancelled_at = new Date();
        trip.cancellation_reason = dto.reason || '';
        if (trip.status === 'accepted') {
            const serviceType = await this.serviceTypeRepo.findOne({ where: { id: trip.service_type_id } });
            if (serviceType && serviceType.cancellation_fee > 0) {
                const wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
                if (wallet && wallet.balance >= serviceType.cancellation_fee) {
                    wallet.balance = Number(wallet.balance) - Number(serviceType.cancellation_fee);
                    await this.walletRepo.save(wallet);
                    await this.transactionRepo.save(this.transactionRepo.create({
                        wallet_id: wallet.id,
                        trip_id: trip.id,
                        type: 'withdrawal',
                        amount: serviceType.cancellation_fee,
                        balance_before: Number(wallet.balance) + Number(serviceType.cancellation_fee),
                        balance_after: wallet.balance,
                        reference: `CANCEL-${trip.id}`,
                        description: `Cancellation fee for trip ${trip.id}`,
                        status: 'completed',
                    }));
                }
            }
        }
        await this.tripRepo.save(trip);
        return this.tripRepo.findOne({ where: { id: trip.id }, relations: ['service_type'] });
    }
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
};
exports.TripsService = TripsService;
exports.TripsService = TripsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(trip_entity_1.Trip)),
    __param(1, (0, typeorm_1.InjectRepository)(service_type_entity_1.ServiceType)),
    __param(2, (0, typeorm_1.InjectRepository)(trip_location_entity_1.TripLocation)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(5, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(6, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], TripsService);
//# sourceMappingURL=trips.service.js.map