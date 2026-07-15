import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4, v4 } from 'uuid';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Wallet } from '../wallets/entities/wallet.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const password_hash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      phone: dto.phone,
      full_name: dto.full_name,
      password_hash,
    });
    await this.userRepo.save(user);
    await this.walletRepo.save(this.walletRepo.create({ user_id: user.id }));

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, is_active: true },
      select: ['id', 'email', 'password_hash', 'role', 'full_name', 'phone', 'avatar_url', 'is_verified'],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { user_id: userId, token_hash: tokenHash },
      relations: ['user'],
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.expires_at < new Date()) {
      await this.refreshTokenRepo.remove(stored);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = stored.user;
    if (!user.is_active) {
      throw new UnauthorizedException('User account is deactivated');
    }

    await this.refreshTokenRepo.remove(stored);
    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepo.delete({ user_id: userId, token_hash: tokenHash });
    return { message: 'Logged out successfully' };
  }

  async cleanupExpiredTokens() {
    await this.refreshTokenRepo.delete({ expires_at: LessThan(new Date()) });
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token = this.jwtService.sign(payload);

    const rawRefreshToken = uuidv4();
    const refresh_token = rawRefreshToken;
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
      },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
