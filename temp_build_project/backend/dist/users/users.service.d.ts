import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserLocation } from './entities/user-location.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateLocationDto } from './dto/create-location.dto';
export declare class UsersService {
    private readonly userRepo;
    private readonly locationRepo;
    constructor(userRepo: Repository<User>, locationRepo: Repository<UserLocation>);
    getProfile(userId: string): Promise<User>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<User>;
    getLocations(userId: string): Promise<UserLocation[]>;
    createLocation(userId: string, dto: CreateLocationDto): Promise<UserLocation>;
    findById(id: string): Promise<User>;
}
