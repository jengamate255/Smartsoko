import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async processPayment(userId: string, dto: ProcessPaymentDto) {
    const trip = await this.tripRepo.findOne({ where: { id: dto.trip_id, customer_id: userId } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.payment_status === 'completed') {
      throw new BadRequestException('Trip already paid');
    }
    if (trip.status !== 'completed') {
      throw new BadRequestException('Trip must be completed before payment');
    }

    const paymentMethod = await this.paymentMethodRepo.findOne({
      where: { id: dto.payment_method_id, user_id: userId, is_active: true },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    const amount = trip.final_price || trip.estimated_price || 0;
    if (amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
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

  async refundPayment(userId: string, dto: RefundPaymentDto) {
    const trip = await this.tripRepo.findOne({ where: { id: dto.trip_id, customer_id: userId } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    if (trip.payment_status !== 'completed') {
      throw new BadRequestException('Payment has not been completed');
    }

    const amount = trip.final_price || trip.estimated_price || 0;

    trip.payment_status = 'refunded';
    await this.tripRepo.save(trip);

    const wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
    if (wallet) {
      const prevBalance = Number(wallet.balance);
      wallet.balance = prevBalance + Number(amount);
      await this.walletRepo.save(wallet);

      await this.transactionRepo.save(
        this.transactionRepo.create({
          wallet_id: wallet.id,
          trip_id: trip.id,
          type: 'refund',
          amount: amount,
          balance_before: prevBalance,
          balance_after: Number(wallet.balance),
          reference: `REFUND-${trip.id}-${uuidv4().slice(0, 8)}`,
          description: dto.reason || `Refund for trip ${trip.id}`,
          status: 'completed',
        }),
      );
    }

    return {
      success: true,
      trip_id: trip.id,
      amount,
      message: 'Payment refunded successfully',
    };
  }

  async getPaymentMethods(userId: string) {
    return this.paymentMethodRepo.find({
      where: { user_id: userId, is_active: true },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async addPaymentMethod(userId: string, dto: AddPaymentMethodDto) {
    if (dto.is_default) {
      await this.paymentMethodRepo.update(
        { user_id: userId },
        { is_default: false },
      );
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
}
