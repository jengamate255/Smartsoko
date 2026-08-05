import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(dto: RefreshTokenDto): Promise<{
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
    logout(req: Request, refreshToken: string): Promise<{
        message: string;
    }>;
}
