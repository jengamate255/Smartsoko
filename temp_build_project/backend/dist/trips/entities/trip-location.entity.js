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
exports.TripLocation = void 0;
const typeorm_1 = require("typeorm");
const trip_entity_1 = require("./trip.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let TripLocation = class TripLocation {
};
exports.TripLocation = TripLocation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TripLocation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trip_id' }),
    __metadata("design:type", String)
], TripLocation.prototype, "trip_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'driver_id' }),
    __metadata("design:type", String)
], TripLocation.prototype, "driver_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision' }),
    __metadata("design:type", Number)
], TripLocation.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision' }),
    __metadata("design:type", Number)
], TripLocation.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], TripLocation.prototype, "recorded_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => trip_entity_1.Trip, (t) => t.trip_locations, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'trip_id' }),
    __metadata("design:type", trip_entity_1.Trip)
], TripLocation.prototype, "trip", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.chat_messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", user_entity_1.User)
], TripLocation.prototype, "driver", void 0);
exports.TripLocation = TripLocation = __decorate([
    (0, typeorm_1.Entity)('trip_locations')
], TripLocation);
//# sourceMappingURL=trip-location.entity.js.map