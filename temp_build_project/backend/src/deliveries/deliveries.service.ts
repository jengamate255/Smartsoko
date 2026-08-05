import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from './entities/delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepo: Repository<Delivery>,
  ) {}

  async create(customerId: string, dto: CreateDeliveryDto) {
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

  async getAvailable(page: number = 1, limit: number = 20) {
    const [deliveries, total] = await this.deliveryRepo.findAndCount({
      where: { status: 'PENDING' },
      relations: ['customer'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { deliveries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async accept(deliveryId: string, driverId: string) {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.status !== 'PENDING') {
      throw new BadRequestException('Delivery is no longer available');
    }
    delivery.driver_id = driverId;
    delivery.status = 'ACCEPTED';
    delivery.accepted_at = new Date();
    return this.deliveryRepo.save(delivery);
  }

  async reject(deliveryId: string, driverId: string) {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.status !== 'PENDING') {
      throw new BadRequestException('Delivery is no longer available');
    }
    delivery.status = 'CANCELLED';
    delivery.cancelled_at = new Date();
    return this.deliveryRepo.save(delivery);
  }

  async updateStatus(deliveryId: string, driverId: string, dto: UpdateDeliveryStatusDto) {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.driver_id !== driverId) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }
    const validTransitions: Record<string, string[]> = {
      ACCEPTED: ['PICKED_UP'],
      PICKED_UP: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED'],
    };
    const allowed = validTransitions[delivery.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${delivery.status} to ${dto.status}`);
    }
    delivery.status = dto.status;
    if (dto.status === 'PICKED_UP') delivery.picked_up_at = new Date();
    if (dto.status === 'DELIVERED') delivery.delivered_at = new Date();
    return this.deliveryRepo.save(delivery);
  }

  async getActive(driverId: string) {
    return this.deliveryRepo.findOne({
      where: { driver_id: driverId, status: 'ACCEPTED' },
      relations: ['customer'],
      order: { accepted_at: 'DESC' },
    });
  }

  async getHistory(driverId: string, page: number = 1, limit: number = 20) {
    const [deliveries, total] = await this.deliveryRepo.findAndCount({
      where: { driver_id: driverId, status: 'DELIVERED' },
      relations: ['customer'],
      order: { delivered_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { deliveries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
