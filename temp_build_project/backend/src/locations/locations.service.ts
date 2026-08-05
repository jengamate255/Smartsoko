import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverAvailability } from './entities/driver-availability.entity';
import { SearchDriversDto } from './dto/search-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(DriverAvailability)
    private readonly driverRepo: Repository<DriverAvailability>,
  ) {}

  async searchNearbyDrivers(dto: SearchDriversDto) {
    const { latitude, longitude, radius_meters } = dto;
    const radiusKm = (radius_meters || 3000) / 1000;

    const drivers = await this.driverRepo.query(
      `SELECT
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
      ORDER BY distance_km ASC`,
      [latitude, longitude, radiusKm],
    );

    return drivers.map((d: any) => ({
      ...d,
      distance_meters: Math.round(Number(d.distance_km) * 1000),
      distance_km: undefined,
    }));
  }

  async updateDriverLocation(driverId: string, dto: UpdateLocationDto) {
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

  async getDriverStatus(driverId: string) {
    const driver = await this.driverRepo.findOne({ where: { driver_id: driverId } });
    return driver || { driver_id: driverId, is_online: false };
  }
}
