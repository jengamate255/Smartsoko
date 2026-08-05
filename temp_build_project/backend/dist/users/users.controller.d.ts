import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { Request } from 'express';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: Request): Promise<import("./entities/user.entity").User>;
    updateProfile(req: Request, dto: UpdateProfileDto): Promise<import("./entities/user.entity").User>;
    getLocations(req: Request): Promise<import("./entities/user-location.entity").UserLocation[]>;
    createLocation(req: Request, dto: CreateLocationDto): Promise<import("./entities/user-location.entity").UserLocation>;
}
