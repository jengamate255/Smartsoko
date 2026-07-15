import { User } from '../../users/entities/user.entity';
import { Transaction } from './transaction.entity';
export declare class Wallet {
    id: string;
    user_id: string;
    balance: number;
    currency: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    user: User;
    transactions: Transaction[];
}
