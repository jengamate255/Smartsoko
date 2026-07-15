import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('driver_availability')
export class DriverAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id', unique: true })
  driver_id: string;

  @Column({ default: false })
  is_online: boolean;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ length: 50, nullable: true })
  vehicle_type: string;

  @Column({ length: 30, nullable: true })
  vehicle_color: string;

  @Column({ length: 20, nullable: true })
  vehicle_plate: string;

  @Column({ default: false })
  is_on_trip: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => User, (u) => u.driver_availability, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;
}
