import { LocationsService } from './locations.service';
import { SearchDriversDto } from './dto/search-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Request } from 'express';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    searchDrivers(dto: SearchDriversDto): Promise<any>;
    updateLocation(req: Request, dto: UpdateLocationDto): Promise<import("./entities/driver-availability.entity").DriverAvailability>;
    getDriverStatus(req: Request): Promise<import("./entities/driver-availability.entity").DriverAvailability | {
        driver_id: string;
        is_online: false;
    }>;
}
