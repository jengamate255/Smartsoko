import { Controller, Get, Patch, Post, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: Request) {
    return this.usersService.getProfile(req.user!['id']);
  }

  @Patch('profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user!['id'], dto);
  }

  @Get('locations')
  async getLocations(@Req() req: Request) {
    return this.usersService.getLocations(req.user!['id']);
  }

  @Post('locations')
  async createLocation(@Req() req: Request, @Body() dto: CreateLocationDto) {
    return this.usersService.createLocation(req.user!['id'], dto);
  }
}
