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
exports.DeliveriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const delivery_entity_1 = require("./entities/delivery.entity");
let DeliveriesService = class DeliveriesService {
    constructor(deliveryRepo) {
        this.deliveryRepo = deliveryRepo;
    }
    async create(customerId, dto) {
        const delivery = this.deliveryRepo.create({
            customer_id: customerId,
            pickup_name: dto.pickup_name,
            pickup_address: dto.pickup_address,
            pickup_latitude: dto.pickup_lat,
            pickup_longitude: dto.pickup_lng,
            dropoff_name: dto.dropoff_name,
            dropoff_address: dto.dropoff_address,
            dropoff_latitude: dto.dropoff_lat,
            dropoff_longitude: dto.dropoff_lng,
            customer_name: dto.customer_name,
            customer_phone: dto.customer_phone,
            items: dto.items,
            total_amount: dto.total_amount,
            delivery_fee: dto.delivery_fee || 0,
            status: 'PENDING',
            estimated_distance: dto.estimated_distance,
            estimated_duration: dto.estimated_duration,
            delivery_instructions: dto.delivery_instructions,
        });
        return this.deliveryRepo.save(delivery);
    }
    async getAvailable(page = 1, limit = 20) {
        const [deliveries, total] = await this.deliveryRepo.findAndCount({
            where: { status: 'PENDING' },
            relations: ['customer'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { deliveries, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async accept(deliveryId, driverId) {
        const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
        if (!delivery) {
            throw new common_1.NotFoundException('Delivery not found');
        }
        if (delivery.status !== 'PENDING') {
            throw new common_1.BadRequestException('Delivery is no longer available');
        }
        delivery.driver_id = driverId;
        delivery.status = 'ACCEPTED';
        delivery.accepted_at = new Date();
        return this.deliveryRepo.save(delivery);
    }
    async reject(deliveryId, driverId) {
        const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
        if (!delivery) {
            throw new common_1.NotFoundException('Delivery not found');
        }
        if (delivery.status !== 'PENDING') {
            throw new common_1.BadRequestException('Delivery is no longer available');
        }
        delivery.status = 'CANCELLED';
        delivery.cancelled_at = new Date();
        return this.deliveryRepo.save(delivery);
    }
    async updateStatus(deliveryId, driverId, dto) {
        const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
        if (!delivery) {
            throw new common_1.NotFoundException('Delivery not found');
        }
        if (delivery.driver_id !== driverId) {
            throw new common_1.ForbiddenException('You are not assigned to this delivery');
        }
        const validTransitions = {
            ACCEPTED: ['PICKED_UP'],
            PICKED_UP: ['IN_TRANSIT'],
            IN_TRANSIT: ['DELIVERED'],
        };
        const allowed = validTransitions[delivery.status] || [];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${delivery.status} to ${dto.status}`);
        }
        delivery.status = dto.status;
        if (dto.status === 'PICKED_UP')
            delivery.picked_up_at = new Date();
        if (dto.status === 'DELIVERED')
            delivery.delivered_at = new Date();
        return this.deliveryRepo.save(delivery);
    }
    async getActive(driverId) {
        return this.deliveryRepo.findOne({
            where: { driver_id: driverId, status: 'ACCEPTED' },
            relations: ['customer'],
            order: { accepted_at: 'DESC' },
        });
    }
    async getHistory(driverId, page = 1, limit = 20) {
        const [deliveries, total] = await this.deliveryRepo.findAndCount({
            where: { driver_id: driverId, status: 'DELIVERED' },
            relations: ['customer'],
            order: { delivered_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { deliveries, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
};
exports.DeliveriesService = DeliveriesService;
exports.DeliveriesService = DeliveriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(delivery_entity_1.Delivery)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DeliveriesService);
//# sourceMappingURL=deliveries.service.js.map