import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripsService } from './trips.service';
import { EstimateDto } from './dto/estimate.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { ServiceType } from './entities/service-type.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller()
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
  ) {}

  @Get('services')
  async getServiceTypes() {
    return this.serviceTypeRepo.find({ where: { is_active: true } });
  }

  @Post('trips/estimate')
  async estimate(@Body() dto: EstimateDto) {
    return this.tripsService.estimatePrice(dto);
  }

  @Post('trips')
  async create(@Req() req: Request, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(req.user!['id'], dto);
  }

  @Get('trips')
  async list(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.tripsService.getCustomerTrips(req.user!['id'], parseInt(page) || 1, parseInt(limit) || 20);
  }

  @Get('trips/active')
  async getActive(@Req() req: Request) {
    const active = await this.tripsService.getActiveTrip(req.user!['id']);
    return active || null;
  }

  @Get('trips/:id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    return this.tripsService.getTripById(id, req.user!['id']);
  }

  @Patch('trips/:id/cancel')
  async cancel(@Req() req: Request, @Param('id') id: string, @Body() dto: CancelTripDto) {
    return this.tripsService.cancelTrip(id, req.user!['id'], dto);
  }
}
