import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { Trip } from '../../trips/entities/trip.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id' })
  wallet_id: string;

  @Column({ name: 'trip_id', nullable: true })
  trip_id: string;

  @Column({ length: 20 })
  type: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balance_after: number;

  @Column({ length: 100, nullable: true, unique: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Wallet, (w) => w.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @ManyToOne(() => Trip, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;
}
