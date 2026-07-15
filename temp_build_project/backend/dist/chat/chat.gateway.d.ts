import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { Trip } from '../trips/entities/trip.entity';
interface ChatSocket extends Socket {
    userId?: string;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatMessageRepo;
    private readonly tripRepo;
    server: Server;
    private onlineUsers;
    constructor(chatMessageRepo: Repository<ChatMessage>, tripRepo: Repository<Trip>);
    handleConnection(client: ChatSocket): void;
    handleDisconnect(client: ChatSocket): void;
    handleJoinChat(client: ChatSocket, data: {
        tripId: string;
    }): Promise<{
        event: string;
        data: {
            message: string;
            tripId?: undefined;
        };
    } | {
        event: string;
        data: {
            tripId: string;
            message?: undefined;
        };
    }>;
    handleMessage(client: ChatSocket, data: {
        tripId: string;
        message: string;
        message_type?: string;
    }): Promise<{
        event: string;
        data: {
            message: string;
        };
    } | {
        event: string;
        data: {
            id: string;
            tripId: string;
            senderId: string;
            message: string;
            messageType: string;
            createdAt: Date;
        };
    }>;
    handleHistory(client: ChatSocket, data: {
        tripId: string;
        page?: number;
        limit?: number;
    }): Promise<{
        event: string;
        data: {
            messages: ChatMessage[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    handleTyping(client: ChatSocket, data: {
        tripId: string;
        isTyping: boolean;
    }): void;
}
export {};
