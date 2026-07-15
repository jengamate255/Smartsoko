import { Wallet } from './wallet.entity';
import { Trip } from '../../trips/entities/trip.entity';
export declare class Transaction {
    id: string;
    wallet_id: string;
    trip_id: string;
    type: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    reference: string;
    description: string;
    status: string;
    created_at: Date;
    wallet: Wallet;
    trip: Trip;
}
