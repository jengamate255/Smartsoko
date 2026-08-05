import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    @InjectRepository(TripLocation)
    private readonly tripLocationRepo: Repository<TripLocation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async estimatePrice(dto: EstimateDto) {
    const serviceType = await this.serviceTypeRepo.findOne({ where: { id: dto.service_type_id, is_active: true } });
    if (!serviceType) {
      throw new NotFoundException('Service type not found');
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

  async createTrip(customerId: string, dto: CreateTripDto) {
    const serviceType = await this.serviceTypeRepo.findOne({ where: { id: dto.service_type_id, is_active: true } });
    if (!serviceType) {
      throw new NotFoundException('Service type not found');
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

    const saved = await this.tripRepo.save(trip) as Trip;

    await this.notificationRepo.save(
      this.notificationRepo.create({
        user_id: customerId,
        title: 'Trip Created',
        body: `Your trip has been requested. Estimated price: $${estimate.estimated_price}`,
        type: 'trip',
        reference_id: saved.id,
      }),
    );

    return this.tripRepo.findOne({ where: { id: saved.id }, relations: ['service_type'] });
  }

  async getTripById(tripId: string, userId: string) {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['service_type', 'customer', 'driver'],
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.customer_id !== userId && trip.driver_id !== userId) {
      throw new ForbiddenException('You do not have access to this trip');
    }
    return trip;
  }

  async getCustomerTrips(customerId: string, page: number = 1, limit: number = 20) {
    const [trips, total] = await this.tripRepo.findAndCount({
      where: { customer_id: customerId },
      relations: ['service_type', 'driver'],
      order: { requested_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return trips;
  }

  async getActiveTrip(customerId: string) {
    return this.tripRepo.findOne({
      where: { customer_id: customerId, status: 'requested' },
      relations: ['service_type', 'driver'],
      order: { requested_at: 'DESC' },
    });
  }

  async cancelTrip(tripId: string, userId: string, dto: CancelTripDto) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.customer_id !== userId) {
      throw new ForbiddenException('Only the customer can cancel this trip');
    }
    if (!['requested', 'accepted'].includes(trip.status)) {
      throw new BadRequestException('Trip cannot be cancelled at current status');
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
          await this.transactionRepo.save(
            this.transactionRepo.create({
              wallet_id: wallet.id,
              trip_id: trip.id,
              type: 'withdrawal',
              amount: serviceType.cancellation_fee,
              balance_before: Number(wallet.balance) + Number(serviceType.cancellation_fee),
              balance_after: wallet.balance,
              reference: `CANCEL-${trip.id}`,
              description: `Cancellation fee for trip ${trip.id}`,
              status: 'completed',
            }),
          );
        }
      }
    }

    await this.tripRepo.save(trip);

    return this.tripRepo.findOne({ where: { id: trip.id }, relations: ['service_type'] });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2))
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
