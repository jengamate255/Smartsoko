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
exports.Delivery = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let Delivery = class Delivery {
};
exports.Delivery = Delivery;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Delivery.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id' }),
    __metadata("design:type", String)
], Delivery.prototype, "customer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'driver_id', nullable: true }),
    __metadata("design:type", String)
], Delivery.prototype, "driver_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Delivery.prototype, "pickup_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Delivery.prototype, "pickup_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'pickup_latitude' }),
    __metadata("design:type", Number)
], Delivery.prototype, "pickup_latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'pickup_longitude' }),
    __metadata("design:type", Number)
], Delivery.prototype, "pickup_longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, name: 'dropoff_name' }),
    __metadata("design:type", String)
], Delivery.prototype, "dropoff_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'dropoff_address' }),
    __metadata("design:type", String)
], Delivery.prototype, "dropoff_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'dropoff_latitude' }),
    __metadata("design:type", Number)
], Delivery.prototype, "dropoff_latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'dropoff_longitude' }),
    __metadata("design:type", Number)
], Delivery.prototype, "dropoff_longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, name: 'customer_name' }),
    __metadata("design:type", String)
], Delivery.prototype, "customer_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, name: 'customer_phone' }),
    __metadata("design:type", String)
], Delivery.prototype, "customer_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Array)
], Delivery.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' }),
    __metadata("design:type", Number)
], Delivery.prototype, "total_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'delivery_fee', default: 0 }),
    __metadata("design:type", Number)
], Delivery.prototype, "delivery_fee", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, default: 'PENDING' }),
    __metadata("design:type", String)
], Delivery.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'estimated_distance' }),
    __metadata("design:type", Number)
], Delivery.prototype, "estimated_distance", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, name: 'estimated_duration' }),
    __metadata("design:type", String)
], Delivery.prototype, "estimated_duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'delivery_instructions' }),
    __metadata("design:type", String)
], Delivery.prototype, "delivery_instructions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'updated_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'accepted_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "accepted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'picked_up_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "picked_up_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'delivered_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "delivered_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'cancelled_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "cancelled_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", user_entity_1.User)
], Delivery.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", user_entity_1.User)
], Delivery.prototype, "driver", void 0);
exports.Delivery = Delivery = __decorate([
    (0, typeorm_1.Entity)('deliveries')
], Delivery);
//# sourceMappingURL=delivery.entity.js.map