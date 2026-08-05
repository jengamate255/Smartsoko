"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const trips_service_1 = require("./trips.service");
const trips_controller_1 = require("./trips.controller");
const trips_gateway_1 = require("./trips.gateway");
const trip_entity_1 = require("./entities/trip.entity");
const service_type_entity_1 = require("./entities/service-type.entity");
const trip_location_entity_1 = require("./entities/trip-location.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const wallet_entity_1 = require("../wallets/entities/wallet.entity");
const transaction_entity_1 = require("../wallets/entities/transaction.entity");
const auth_module_1 = require("../auth/auth.module");
let TripsModule = class TripsModule {
};
exports.TripsModule = TripsModule;
exports.TripsModule = TripsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([trip_entity_1.Trip, service_type_entity_1.ServiceType, trip_location_entity_1.TripLocation, user_entity_1.User, notification_entity_1.Notification, wallet_entity_1.Wallet, transaction_entity_1.Transaction]),
            auth_module_1.AuthModule,
        ],
        controllers: [trips_controller_1.TripsController],
        providers: [trips_service_1.TripsService, trips_gateway_1.TripsGateway],
        exports: [trips_service_1.TripsService, trips_gateway_1.TripsGateway],
    })
], TripsModule);
//# sourceMappingURL=trips.module.js.map