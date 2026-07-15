import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { TripLocation } from './entities/trip-location.entity';
import { Trip } from './entities/trip.entity';
interface AuthenticatedSocket extends Socket {
    userId?: string;
}
export declare class TripsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly tripLocationRepo;
    private readonly tripRepo;
    server: Server;
    private userSockets;
    constructor(tripLocationRepo: Repository<TripLocation>, tripRepo: Repository<Trip>);
    handleConnection(client: AuthenticatedSocket): void;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoinTrip(client: AuthenticatedSocket, data: {
        tripId: string;
    }): Promise<{
        event: string;
        data: {
            tripId: string;
        };
    }>;
    handleDriverLocation(client: AuthenticatedSocket, data: {
        tripId: string;
        latitude: number;
        longitude: number;
    }): Promise<void>;
    handleStatusUpdate(client: AuthenticatedSocket, data: {
        tripId: string;
        status: string;
    }): Promise<void>;
    sendToUser(userId: string, event: string, data: any): void;
    sendToTrip(tripId: string, event: string, data: any): void;
}
export {};
