"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const trip_entity_1 = require("../trips/entities/trip.entity");
let ChatGateway = class ChatGateway {
    constructor(chatMessageRepo, tripRepo) {
        this.chatMessageRepo = chatMessageRepo;
        this.tripRepo = tripRepo;
        this.onlineUsers = new Map();
    }
    handleConnection(client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            client.userId = userId;
            if (!this.onlineUsers.has(userId)) {
                this.onlineUsers.set(userId, new Set());
            }
            this.onlineUsers.get(userId).add(client.id);
            client.join(`user:${userId}`);
            this.server.emit('user:online', { userId });
        }
    }
    handleDisconnect(client) {
        const userId = client.userId;
        if (userId && this.onlineUsers.has(userId)) {
            this.onlineUsers.get(userId).delete(client.id);
            if (this.onlineUsers.get(userId).size === 0) {
                this.onlineUsers.delete(userId);
                this.server.emit('user:offline', { userId });
            }
        }
    }
    async handleJoinChat(client, data) {
        const trip = await this.tripRepo.findOne({ where: { id: data.tripId } });
        if (!trip) {
            return { event: 'error', data: { message: 'Trip not found' } };
        }
        client.join(`chat:${data.tripId}`);
        return { event: 'chat:joined', data: { tripId: data.tripId } };
    }
    async handleMessage(client, data) {
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
    async handleHistory(client, data) {
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
    handleTyping(client, data) {
        client.to(`chat:${data.tripId}`).emit('chat:typing', {
            tripId: data.tripId,
            userId: client.userId,
            isTyping: data.isTyping,
        });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:history'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleHistory", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/chat',
        cors: { origin: '*', credentials: true },
    }),
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(trip_entity_1.Trip)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map