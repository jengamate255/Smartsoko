import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
export declare class PaymentsService {
    private readonly paymentMethodRepo;
    private readonly tripRepo;
    private readonly walletRepo;
    private readonly transactionRepo;
    constructor(paymentMethodRepo: Repository<PaymentMethod>, tripRepo: Repository<Trip>, walletRepo: Repository<Wallet>, transactionRepo: Repository<Transaction>);
    processPayment(userId: string, dto: ProcessPaymentDto): Promise<{
        success: boolean;
        trip_id: string;
        amount: number;
        payment_method: string;
        message: string;
    }>;
    refundPayment(userId: string, dto: RefundPaymentDto): Promise<{
        success: boolean;
        trip_id: string;
        amount: number;
        message: string;
    }>;
    getPaymentMethods(userId: string): Promise<PaymentMethod[]>;
    addPaymentMethod(userId: string, dto: AddPaymentMethodDto): Promise<PaymentMethod>;
}
