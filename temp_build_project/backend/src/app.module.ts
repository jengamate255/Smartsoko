import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { PaymentsModule } from './payments/payments.module';
import { LocationsModule } from './locations/locations.module';
import { WalletsModule } from './wallets/wallets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    TripsModule,
    PaymentsModule,
    LocationsModule,
    WalletsModule,
    NotificationsModule,
    ChatModule,
  ],
})
export class AppModule {}
