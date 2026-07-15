import { WalletsService } from './wallets.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { Request } from 'express';
export declare class WalletsController {
    private readonly walletsService;
    constructor(walletsService: WalletsService);
    getBalance(req: Request): Promise<import("./entities/wallet.entity").Wallet>;
    deposit(req: Request, dto: DepositDto): Promise<{
        wallet: import("./entities/wallet.entity").Wallet;
        transaction: import("./entities/transaction.entity").Transaction;
    }>;
    withdraw(req: Request, dto: WithdrawDto): Promise<{
        wallet: import("./entities/wallet.entity").Wallet;
        transaction: import("./entities/transaction.entity").Transaction;
    }>;
    getTransactions(req: Request, page?: string, limit?: string): Promise<{
        transactions: import("./entities/transaction.entity").Transaction[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
