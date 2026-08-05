"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const refresh_token_entity_1 = require("../auth/entities/refresh-token.entity");
const user_location_entity_1 = require("../users/entities/user-location.entity");
const service_type_entity_1 = require("../trips/entities/service-type.entity");
const trip_entity_1 = require("../trips/entities/trip.entity");
const trip_location_entity_1 = require("../trips/entities/trip-location.entity");
const wallet_entity_1 = require("../wallets/entities/wallet.entity");
const transaction_entity_1 = require("../wallets/entities/transaction.entity");
const payment_method_entity_1 = require("../payments/entities/payment-method.entity");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const chat_message_entity_1 = require("../chat/entities/chat-message.entity");
const driver_availability_entity_1 = require("../locations/entities/driver-availability.entity");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: () => {
                    const isDev = process.env.NODE_ENV !== 'production';
                    return {
                        type: 'postgres',
                        url: process.env.DATABASE_URL,
                        entities: [
                            user_entity_1.User, refresh_token_entity_1.RefreshToken, user_location_entity_1.UserLocation, service_type_entity_1.ServiceType, trip_entity_1.Trip, trip_location_entity_1.TripLocation,
                            wallet_entity_1.Wallet, transaction_entity_1.Transaction, payment_method_entity_1.PaymentMethod, notification_entity_1.Notification, chat_message_entity_1.ChatMessage, driver_availability_entity_1.DriverAvailability,
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
], DatabaseModule);
//# sourceMappingURL=database.module.js.map