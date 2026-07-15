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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const refresh_token_entity_1 = require("../../auth/entities/refresh-token.entity");
const user_location_entity_1 = require("./user-location.entity");
const trip_entity_1 = require("../../trips/entities/trip.entity");
const wallet_entity_1 = require("../../wallets/entities/wallet.entity");
const payment_method_entity_1 = require("../../payments/entities/payment-method.entity");
const notification_entity_1 = require("../../notifications/entities/notification.entity");
const chat_message_entity_1 = require("../../chat/entities/chat-message.entity");
const driver_availability_entity_1 = require("../../locations/entities/driver-availability.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 255 }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 20 }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], User.prototype, "full_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], User.prototype, "password_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatar_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'customer' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "is_verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => refresh_token_entity_1.RefreshToken, (rt) => rt.user),
    __metadata("design:type", Array)
], User.prototype, "refresh_tokens", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_location_entity_1.UserLocation, (ul) => ul.user),
    __metadata("design:type", Array)
], User.prototype, "locations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => trip_entity_1.Trip, (t) => t.customer),
    __metadata("design:type", Array)
], User.prototype, "customer_trips", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => trip_entity_1.Trip, (t) => t.driver),
    __metadata("design:type", Array)
], User.prototype, "driver_trips", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => wallet_entity_1.Wallet, (w) => w.user),
    __metadata("design:type", Array)
], User.prototype, "wallets", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_method_entity_1.PaymentMethod, (pm) => pm.user),
    __metadata("design:type", Array)
], User.prototype, "payment_methods", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => notification_entity_1.Notification, (n) => n.user),
    __metadata("design:type", Array)
], User.prototype, "notifications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_message_entity_1.ChatMessage, (cm) => cm.sender),
    __metadata("design:type", Array)
], User.prototype, "chat_messages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => driver_availability_entity_1.DriverAvailability, (da) => da.driver),
    __metadata("design:type", Array)
], User.prototype, "driver_availability", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map