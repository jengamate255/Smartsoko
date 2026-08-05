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
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wallet_entity_1 = require("./entities/wallet.entity");
const transaction_entity_1 = require("./entities/transaction.entity");
const uuid_1 = require("uuid");
let WalletsService = class WalletsService {
    constructor(walletRepo, transactionRepo) {
        this.walletRepo = walletRepo;
        this.transactionRepo = transactionRepo;
    }
    async getBalance(userId) {
        let wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
        if (!wallet) {
            wallet = this.walletRepo.create({ user_id: userId });
            await this.walletRepo.save(wallet);
        }
        return wallet;
    }
    async deposit(userId, dto) {
        const wallet = await this.getOrCreateWallet(userId);
        const prevBalance = Number(wallet.balance);
        wallet.balance = prevBalance + Number(dto.amount);
        await this.walletRepo.save(wallet);
        const transaction = this.transactionRepo.create({
            wallet_id: wallet.id,
            type: 'deposit',
            amount: dto.amount,
            balance_before: prevBalance,
            balance_after: Number(wallet.balance),
            reference: `DEP-${(0, uuid_1.v4)().slice(0, 12).toUpperCase()}`,
            description: dto.description || 'Wallet deposit',
            status: 'completed',
        });
        await this.transactionRepo.save(transaction);
        return { wallet, transaction };
    }
    async withdraw(userId, dto) {
        const wallet = await this.getOrCreateWallet(userId);
        if (Number(wallet.balance) < dto.amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        const prevBalance = Number(wallet.balance);
        wallet.balance = prevBalance - Number(dto.amount);
        await this.walletRepo.save(wallet);
        const transaction = this.transactionRepo.create({
            wallet_id: wallet.id,
            type: 'withdrawal',
            amount: dto.amount,
            balance_before: prevBalance,
            balance_after: Number(wallet.balance),
            reference: `WTH-${(0, uuid_1.v4)().slice(0, 12).toUpperCase()}`,
            description: dto.description || 'Wallet withdrawal',
            status: 'completed',
        });
        await this.transactionRepo.save(transaction);
        return { wallet, transaction };
    }
    async getTransactions(userId, page = 1, limit = 20) {
        const wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
        if (!wallet) {
            return { transactions: [], total: 0, page, limit, totalPages: 0 };
        }
        const [transactions, total] = await this.transactionRepo.findAndCount({
            where: { wallet_id: wallet.id },
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getOrCreateWallet(userId) {
        let wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
        if (!wallet) {
            wallet = this.walletRepo.create({ user_id: userId });
            await this.walletRepo.save(wallet);
        }
        return wallet;
    }
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(1, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map