import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { UserLocation } from '../users/entities/user-location.entity';
import { ServiceType } from '../trips/entities/service-type.entity';
import { Trip } from '../trips/entities/trip.entity';
import { TripLocation } from '../trips/entities/trip-location.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { DriverAvailability } from '../locations/entities/driver-availability.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isDev = process.env.NODE_ENV !== 'production';
        return {
          type: 'postgres',
          url: process.env.DATABASE_URL,
          entities: [
            User, RefreshToken, UserLocation, ServiceType, Trip, TripLocation,
            Wallet, Transaction, PaymentMethod, Notification, ChatMessage, DriverAvailability,
          ],
          synchronize: false,
          logging: isDev,
          ssl: !isDev ? { rejectUnauthorized: false } : false,
          retryAttempts: isDev ? 0 : 10,
          retryDelay: 3000,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
