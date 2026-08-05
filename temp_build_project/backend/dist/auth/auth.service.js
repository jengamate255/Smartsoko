"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
const user_entity_1 = require("../users/entities/user.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const wallet_entity_1 = require("../wallets/entities/wallet.entity");
let AuthService = class AuthService {
    constructor(userRepo, refreshTokenRepo, walletRepo, jwtService) {
        this.userRepo = userRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.walletRepo = walletRepo;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existing = await this.userRepo.findOne({
            where: [{ email: dto.email }, { phone: dto.phone }],
        });
        if (existing) {
            throw new common_1.ConflictException('Email or phone already registered');
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
    async login(dto) {
        const user = await this.userRepo.findOne({
            where: { email: dto.email, is_active: true },
            select: ['id', 'email', 'password_hash', 'role', 'full_name', 'phone', 'avatar_url', 'is_verified'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return this.generateTokens(user);
    }
    async refreshToken(userId, refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshTokenRepo.findOne({
            where: { user_id: userId, token_hash: tokenHash },
            relations: ['user'],
        });
        if (!stored) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (stored.expires_at < new Date()) {
            await this.refreshTokenRepo.remove(stored);
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        const user = stored.user;
        if (!user.is_active) {
            throw new common_1.UnauthorizedException('User account is deactivated');
        }
        await this.refreshTokenRepo.remove(stored);
        return this.generateTokens(user);
    }
    async logout(userId, refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshTokenRepo.delete({ user_id: userId, token_hash: tokenHash });
        return { message: 'Logged out successfully' };
    }
    async cleanupExpiredTokens() {
        await this.refreshTokenRepo.delete({ expires_at: (0, typeorm_2.LessThan)(new Date()) });
    }
    async generateTokens(user) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const access_token = this.jwtService.sign(payload);
        const rawRefreshToken = (0, uuid_1.v4)();
        const refresh_token = rawRefreshToken;
        const tokenHash = this.hashToken(rawRefreshToken);
        await this.refreshTokenRepo.save(this.refreshTokenRepo.create({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }));
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
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(2, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map