import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripsGateway } from './trips.gateway';
import { Trip } from './entities/trip.entity';
import { ServiceType } from './entities/service-type.entity';
import { TripLocation } from './entities/trip-location.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, ServiceType, TripLocation, User, Notification, Wallet, Transaction]),
    AuthModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TripsGateway],
  exports: [TripsService, TripsGateway],
})
export class TripsModule {}
