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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_method_entity_1 = require("./entities/payment-method.entity");
const trip_entity_1 = require("../trips/entities/trip.entity");
const wallet_entity_1 = require("../wallets/entities/wallet.entity");
const transaction_entity_1 = require("../wallets/entities/transaction.entity");
const uuid_1 = require("uuid");
let PaymentsService = class PaymentsService {
    constructor(paymentMethodRepo, tripRepo, walletRepo, transactionRepo) {
        this.paymentMethodRepo = paymentMethodRepo;
        this.tripRepo = tripRepo;
        this.walletRepo = walletRepo;
        this.transactionRepo = transactionRepo;
    }
    async processPayment(userId, dto) {
        const trip = await this.tripRepo.findOne({ where: { id: dto.trip_id, customer_id: userId } });
        if (!trip) {
            throw new common_1.NotFoundException('Trip not found');
        }
        if (trip.payment_status === 'completed') {
            throw new common_1.BadRequestException('Trip already paid');
        }
        if (trip.status !== 'completed') {
            throw new common_1.BadRequestException('Trip must be completed before payment');
        }
        const paymentMethod = await this.paymentMethodRepo.findOne({
            where: { id: dto.payment_method_id, user_id: userId, is_active: true },
        });
        if (!paymentMethod) {
            throw new common_1.NotFoundException('Payment method not found');
        }
        const amount = trip.final_price || trip.estimated_price || 0;
        if (amount <= 0) {
            throw new common_1.BadRequestException('Invalid payment amount');
        }
        trip.payment_status = 'completed';
        await this.tripRepo.save(trip);
        return {
            success: true,
            trip_id: trip.id,
            amount,
            payment_method: paymentMethod.type,
            message: 'Payment processed successfully',
        };
    }
    async refundPayment(userId, dto) {
        const trip = await this.tripRepo.findOne({ where: { id: dto.trip_id, customer_id: userId } });
        if (!trip) {
            throw new common_1.NotFoundException('Trip not found');
        }
        if (trip.payment_status !== 'completed') {
            throw new common_1.BadRequestException('Payment has not been completed');
        }
        const amount = trip.final_price || trip.estimated_price || 0;
        trip.payment_status = 'refunded';
        await this.tripRepo.save(trip);
        const wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
        if (wallet) {
            const prevBalance = Number(wallet.balance);
            wallet.balance = prevBalance + Number(amount);
            await this.walletRepo.save(wallet);
            await this.transactionRepo.save(this.transactionRepo.create({
                wallet_id: wallet.id,
                trip_id: trip.id,
                type: 'refund',
                amount: amount,
                balance_before: prevBalance,
                balance_after: Number(wallet.balance),
                reference: `REFUND-${trip.id}-${(0, uuid_1.v4)().slice(0, 8)}`,
                description: dto.reason || `Refund for trip ${trip.id}`,
                status: 'completed',
            }));
        }
        return {
            success: true,
            trip_id: trip.id,
            amount,
            message: 'Payment refunded successfully',
        };
    }
    async getPaymentMethods(userId) {
        return this.paymentMethodRepo.find({
            where: { user_id: userId, is_active: true },
            order: { is_default: 'DESC', created_at: 'DESC' },
        });
    }
    async addPaymentMethod(userId, dto) {
        if (dto.is_default) {
            await this.paymentMethodRepo.update({ user_id: userId }, { is_default: false });
        }
        const method = this.paymentMethodRepo.create({
            user_id: userId,
            type: dto.type,
            provider: dto.provider,
            identifier: dto.identifier,
            is_default: dto.is_default || false,
        });
        return this.paymentMethodRepo.save(method);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_method_entity_1.PaymentMethod)),
    __param(1, (0, typeorm_1.InjectRepository)(trip_entity_1.Trip)),
    __param(2, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(3, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map