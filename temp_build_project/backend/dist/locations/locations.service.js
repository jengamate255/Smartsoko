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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const driver_availability_entity_1 = require("./entities/driver-availability.entity");
let LocationsService = class LocationsService {
    constructor(driverRepo) {
        this.driverRepo = driverRepo;
    }
    async searchNearbyDrivers(dto) {
        const { latitude, longitude, radius_meters } = dto;
        const radiusKm = (radius_meters || 3000) / 1000;
        const drivers = await this.driverRepo.query(`SELECT
        da.id,
        da.driver_id,
        da.is_online,
        da.is_on_trip,
        da.vehicle_type,
        da.vehicle_color,
        da.vehicle_plate,
        u.full_name,
        u.avatar_url,
        u.phone,
        da.latitude,
        da.longitude,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(da.latitude)) *
            cos(radians(da.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(da.latitude))
          )
        ) as distance_km
      FROM driver_availability da
      JOIN users u ON u.id = da.driver_id
      WHERE da.is_online = true
        AND da.is_on_trip = false
        AND da.latitude IS NOT NULL
        AND da.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(da.latitude)) *
            cos(radians(da.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(da.latitude))
          )
        ) <= $3
      ORDER BY distance_km ASC`, [latitude, longitude, radiusKm]);
        return drivers.map((d) => ({
            ...d,
            distance_meters: Math.round(Number(d.distance_km) * 1000),
            distance_km: undefined,
        }));
    }
    async updateDriverLocation(driverId, dto) {
        const existing = await this.driverRepo.findOne({ where: { driver_id: driverId } });
        if (existing) {
            existing.latitude = dto.latitude;
            existing.longitude = dto.longitude;
            return this.driverRepo.save(existing);
        }
        const driver = this.driverRepo.create({
            driver_id: driverId,
            is_online: true,
            latitude: dto.latitude,
            longitude: dto.longitude,
        });
        return this.driverRepo.save(driver);
    }
    async getDriverStatus(driverId) {
        const driver = await this.driverRepo.findOne({ where: { driver_id: driverId } });
        return driver || { driver_id: driverId, is_online: false };
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(driver_availability_entity_1.DriverAvailability)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LocationsService);
//# sourceMappingURL=locations.service.js.map