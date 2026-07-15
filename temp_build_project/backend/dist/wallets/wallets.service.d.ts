import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
export declare class WalletsService {
    private readonly walletRepo;
    private readonly transactionRepo;
    constructor(walletRepo: Repository<Wallet>, transactionRepo: Repository<Transaction>);
    getBalance(userId: string): Promise<Wallet>;
    deposit(userId: string, dto: DepositDto): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
    withdraw(userId: string, dto: WithdrawDto): Promise<{
        wallet: Wallet;
        transaction: Transaction;
    }>;
    getTransactions(userId: string, page?: number, limit?: number): Promise<{
        transactions: Transaction[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    private getOrCreateWallet;
}
