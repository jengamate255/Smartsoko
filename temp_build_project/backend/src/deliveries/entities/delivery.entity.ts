import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customer_id: string;

  @Column({ name: 'driver_id', nullable: true })
  driver_id: string;

  @Column({ length: 255 })
  pickup_name: string;

  @Column({ type: 'text' })
  pickup_address: string;

  @Column({ type: 'double precision', name: 'pickup_latitude' })
  pickup_latitude: number;

  @Column({ type: 'double precision', name: 'pickup_longitude' })
  pickup_longitude: number;

  @Column({ length: 255, name: 'dropoff_name' })
  dropoff_name: string;

  @Column({ type: 'text', name: 'dropoff_address' })
  dropoff_address: string;

  @Column({ type: 'double precision', name: 'dropoff_latitude' })
  dropoff_latitude: number;

  @Column({ type: 'double precision', name: 'dropoff_longitude' })
  dropoff_longitude: number;

  @Column({ length: 255, name: 'customer_name' })
  customer_name: string;

  @Column({ length: 20, name: 'customer_phone' })
  customer_phone: string;

  @Column({ type: 'jsonb' })
  items: Array<{ name: string; quantity: number; price: number; notes: string | null }>;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  total_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'delivery_fee', default: 0 })
  delivery_fee: number;

  @Column({ length: 30, default: 'PENDING' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'estimated_distance' })
  estimated_distance: number;

  @Column({ length: 50, nullable: true, name: 'estimated_duration' })
  estimated_duration: string;

  @Column({ type: 'text', nullable: true, name: 'delivery_instructions' })
  delivery_instructions: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'accepted_at' })
  accepted_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'picked_up_at' })
  picked_up_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'delivered_at' })
  delivered_at: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelled_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;
}
