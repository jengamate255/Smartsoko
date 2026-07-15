import { Repository } from 'typeorm';
import { DriverAvailability } from './entities/driver-availability.entity';
import { SearchDriversDto } from './dto/search-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
export declare class LocationsService {
    private readonly driverRepo;
    constructor(driverRepo: Repository<DriverAvailability>);
    searchNearbyDrivers(dto: SearchDriversDto): Promise<any>;
    updateDriverLocation(driverId: string, dto: UpdateLocationDto): Promise<DriverAvailability>;
    getDriverStatus(driverId: string): Promise<DriverAvailability | {
        driver_id: string;
        is_online: false;
    }>;
}
