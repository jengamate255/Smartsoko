import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { UserLocation } from './user-location.entity';
import { Trip } from '../../trips/entities/trip.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { PaymentMethod } from '../../payments/entities/payment-method.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { DriverAvailability } from '../../locations/entities/driver-availability.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ length: 255 })
  full_name: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ type: 'text', nullable: true })
  avatar_url: string;

  @Column({ length: 20, default: 'customer' })
  role: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refresh_tokens: RefreshToken[];

  @OneToMany(() => UserLocation, (ul) => ul.user)
  locations: UserLocation[];

  @OneToMany(() => Trip, (t) => t.customer)
  customer_trips: Trip[];

  @OneToMany(() => Trip, (t) => t.driver)
  driver_trips: Trip[];

  @OneToMany(() => Wallet, (w) => w.user)
  wallets: Wallet[];

  @OneToMany(() => PaymentMethod, (pm) => pm.user)
  payment_methods: PaymentMethod[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  @OneToMany(() => ChatMessage, (cm) => cm.sender)
  chat_messages: ChatMessage[];

  @OneToMany(() => DriverAvailability, (da) => da.driver)
  driver_availability: DriverAvailability[];
}
