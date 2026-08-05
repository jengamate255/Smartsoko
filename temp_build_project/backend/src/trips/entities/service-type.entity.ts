import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Trip } from './trip.entity';

@Entity('service_types')
export class ServiceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  icon_url: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_fare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  per_km_rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  per_min_rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_fare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cancellation_fee: number;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => Trip, (t) => t.service_type)
  trips: Trip[];
}
