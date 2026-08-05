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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { Trip } from '../trips/entities/trip.entity';

interface ChatSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
  ) {}

  handleConnection(client: ChatSocket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.userId = userId;
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client.id);
      client.join(`user:${userId}`);
      this.server.emit('user:online', { userId });
    }
  }

  handleDisconnect(client: ChatSocket) {
    const userId = client.userId;
    if (userId && this.onlineUsers.has(userId)) {
      this.onlineUsers.get(userId)!.delete(client.id);
      if (this.onlineUsers.get(userId)!.size === 0) {
        this.onlineUsers.delete(userId);
        this.server.emit('user:offline', { userId });
      }
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { tripId: string },
  ) {
    const trip = await this.tripRepo.findOne({ where: { id: data.tripId } });
    if (!trip) {
      return { event: 'error', data: { message: 'Trip not found' } };
    }
    client.join(`chat:${data.tripId}`);
    return { event: 'chat:joined', data: { tripId: data.tripId } };
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { tripId: string; message: string; message_type?: string },
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Authentication required' } };
    }

    const trip = await this.tripRepo.findOne({ where: { id: data.tripId } });
    if (!trip) {
      return { event: 'error', data: { message: 'Trip not found' } };
    }
    if (trip.customer_id !== client.userId && trip.driver_id !== client.userId) {
      return { event: 'error', data: { message: 'Not part of this trip' } };
    }

    const message = this.chatMessageRepo.create({
      trip_id: data.tripId,
      sender_id: client.userId,
      message: data.message,
      message_type: data.message_type || 'text',
    });
    const saved = await this.chatMessageRepo.save(message);

    const payload = {
      id: saved.id,
      tripId: data.tripId,
      senderId: client.userId,
      message: data.message,
      messageType: data.message_type || 'text',
      createdAt: saved.created_at,
    };

    this.server.to(`chat:${data.tripId}`).emit('chat:message', payload);

    const recipientId = trip.customer_id === client.userId ? trip.driver_id : trip.customer_id;
    if (recipientId) {
      this.server.to(`user:${recipientId}`).emit('chat:notification', {
        tripId: data.tripId,
        senderId: client.userId,
        message: data.message.substring(0, 100),
      });
    }

    return { event: 'chat:sent', data: payload };
  }

  @SubscribeMessage('chat:history')
  async handleHistory(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { tripId: string; page?: number; limit?: number },
  ) {
    const page = data.page || 1;
    const limit = data.limit || 50;
    const [messages, total] = await this.chatMessageRepo.findAndCount({
      where: { trip_id: data.tripId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['sender'],
    });

    return {
      event: 'chat:history',
      data: {
        messages: messages.reverse(),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { tripId: string; isTyping: boolean },
  ) {
    client.to(`chat:${data.tripId}`).emit('chat:typing', {
      tripId: data.tripId,
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }
}
