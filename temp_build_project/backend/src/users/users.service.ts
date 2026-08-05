import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserLocation } from './entities/user-location.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserLocation)
    private readonly locationRepo: Repository<UserLocation>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, is_active: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;

    await this.userRepo.save(user);
    return user;
  }

  async getLocations(userId: string) {
    return this.locationRepo.find({
      where: { user_id: userId },
      order: { is_favorite: 'DESC', created_at: 'DESC' },
    });
  }

  async createLocation(userId: string, dto: CreateLocationDto) {
    const location = this.locationRepo.create({
      user_id: userId,
      name: dto.name,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      is_favorite: dto.is_favorite || false,
    });

    return this.locationRepo.save(location);
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id, is_active: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
