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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const user_location_entity_1 = require("./entities/user-location.entity");
let UsersService = class UsersService {
    constructor(userRepo, locationRepo) {
        this.userRepo = userRepo;
        this.locationRepo = locationRepo;
    }
    async getProfile(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId, is_active: true } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateProfile(userId, dto) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (dto.full_name !== undefined)
            user.full_name = dto.full_name;
        if (dto.avatar_url !== undefined)
            user.avatar_url = dto.avatar_url;
        await this.userRepo.save(user);
        return user;
    }
    async getLocations(userId) {
        return this.locationRepo.find({
            where: { user_id: userId },
            order: { is_favorite: 'DESC', created_at: 'DESC' },
        });
    }
    async createLocation(userId, dto) {
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
    async findById(id) {
        const user = await this.userRepo.findOne({ where: { id, is_active: true } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_location_entity_1.UserLocation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map