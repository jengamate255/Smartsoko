import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { SearchDriversDto } from './dto/search-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('drivers')
  @UseGuards(JwtAuthGuard)
  async searchDrivers(@Query() dto: SearchDriversDto) {
    return this.locationsService.searchNearbyDrivers(dto);
  }

  @Post('driver')
  @UseGuards(JwtAuthGuard)
  async updateLocation(@Req() req: Request, @Body() dto: UpdateLocationDto) {
    return this.locationsService.updateDriverLocation(req.user!['id'], dto);
  }

  @Get('driver/status')
  @UseGuards(JwtAuthGuard)
  async getDriverStatus(@Req() req: Request) {
    return this.locationsService.getDriverStatus(req.user!['id']);
  }
}
