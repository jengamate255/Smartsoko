import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripLocation } from './entities/trip-location.entity';
import { Trip } from './entities/trip.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/trips',
  cors: { origin: '*', credentials: true },
})
@Injectable()
export class TripsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(TripLocation)
    private readonly tripLocationRepo: Repository<TripLocation>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.userId = userId;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('track:join')
  async handleJoinTrip(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string },
  ) {
    client.join(`trip:${data.tripId}`);
    return { event: 'track:joined', data: { tripId: data.tripId } };
  }

  @SubscribeMessage('track:driver-location')
  async handleDriverLocation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string; latitude: number; longitude: number },
  ) {
    const location = this.tripLocationRepo.create({
      trip_id: data.tripId,
      driver_id: client.userId,
      latitude: data.latitude,
      longitude: data.longitude,
    });
    await this.tripLocationRepo.save(location);

    this.server.to(`trip:${data.tripId}`).emit('track:driver-location', {
      tripId: data.tripId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('track:status-update')
  async handleStatusUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string; status: string },
  ) {
    const trip = await this.tripRepo.findOne({ where: { id: data.tripId } });
    if (!trip) return;

    trip.status = data.status;
    if (data.status === 'accepted') trip.accepted_at = new Date();
    if (data.status === 'in_progress') trip.started_at = new Date();
    if (data.status === 'completed') trip.completed_at = new Date();
    if (data.status === 'cancelled') trip.cancelled_at = new Date();

    await this.tripRepo.save(trip);

    this.server.to(`trip:${data.tripId}`).emit('track:status-update', {
      tripId: data.tripId,
      status: data.status,
      timestamp: new Date(),
    });

    this.server.to(`user:${trip.customer_id}`).emit('track:notification', {
      tripId: data.tripId,
      status: data.status,
    });
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToTrip(tripId: string, event: string, data: any) {
    this.server.to(`trip:${tripId}`).emit(event, data);
  }
}
