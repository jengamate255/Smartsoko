import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Wallet } from '../wallets/entities/wallet.entity';
export declare class AuthService {
    private readonly userRepo;
    private readonly refreshTokenRepo;
    private readonly walletRepo;
    private readonly jwtService;
    constructor(userRepo: Repository<User>, refreshTokenRepo: Repository<RefreshToken>, walletRepo: Repository<Wallet>, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            full_name: string;
            phone: string;
            role: string;
            avatar_url: string;
            is_verified: boolean;
        };
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            full_name: string;
            phone: string;
            role: string;
            avatar_url: string;
            is_verified: boolean;
        };
    }>;
    refreshToken(userId: string, refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            full_name: string;
            phone: string;
            role: string;
            avatar_url: string;
            is_verified: boolean;
        };
    }>;
    logout(userId: string, refreshToken: string): Promise<{
        message: string;
    }>;
    cleanupExpiredTokens(): Promise<void>;
    private generateTokens;
    private hashToken;
}
