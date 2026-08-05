import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ServiceType } from './service-type.entity';
import { TripLocation } from './trip-location.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customer_id: string;

  @Column({ name: 'driver_id', nullable: true })
  driver_id: string;

  @Column({ name: 'service_type_id' })
  service_type_id: string;

  @Column({ length: 30, default: 'requested' })
  status: string;

  @Column({ type: 'double precision' })
  pickup_latitude: number;

  @Column({ type: 'double precision' })
  pickup_longitude: number;

  @Column({ type: 'double precision', nullable: true })
  dropoff_latitude: number;

  @Column({ type: 'double precision', nullable: true })
  dropoff_longitude: number;

  @Column({ type: 'text' })
  pickup_address: string;

  @Column({ type: 'text', nullable: true })
  dropoff_address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  final_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance_km: number;

  @Column({ type: 'int', nullable: true })
  duration_min: number;

  @Column({ length: 30, default: 'cash' })
  payment_method: string;

  @Column({ length: 20, default: 'pending' })
  payment_status: string;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  review: string;

  @CreateDateColumn({ type: 'timestamptz' })
  requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date;

  @ManyToOne(() => User, (u) => u.customer_trips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, (u) => u.driver_trips, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @ManyToOne(() => ServiceType, (st) => st.trips)
  @JoinColumn({ name: 'service_type_id' })
  service_type: ServiceType;

  @OneToMany(() => TripLocation, (tl) => tl.trip)
  trip_locations: TripLocation[];

  @OneToMany(() => ChatMessage, (cm) => cm.trip)
  chat_messages: ChatMessage[];
}
