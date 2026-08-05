import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Trip } from './trip.entity';
import { User } from '../../users/entities/user.entity';

@Entity('trip_locations')
export class TripLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  trip_id: string;

  @Column({ name: 'driver_id' })
  driver_id: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @CreateDateColumn({ type: 'timestamptz' })
  recorded_at: Date;

  @ManyToOne(() => Trip, (t) => t.trip_locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @ManyToOne(() => User, (u) => u.chat_messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;
}
