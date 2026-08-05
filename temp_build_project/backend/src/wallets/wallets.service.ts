import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async getBalance(userId: string) {
    let wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ user_id: userId });
      await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async deposit(userId: string, dto: DepositDto) {
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
      reference: `DEP-${uuidv4().slice(0, 12).toUpperCase()}`,
      description: dto.description || 'Wallet deposit',
      status: 'completed',
    });
    await this.transactionRepo.save(transaction);

    return { wallet, transaction };
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException('Insufficient balance');
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
      reference: `WTH-${uuidv4().slice(0, 12).toUpperCase()}`,
      description: dto.description || 'Wallet withdrawal',
      status: 'completed',
    });
    await this.transactionRepo.save(transaction);

    return { wallet, transaction };
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
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

  private async getOrCreateWallet(userId: string) {
    let wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ user_id: userId });
      await this.walletRepo.save(wallet);
    }
    return wallet;
  }
}
