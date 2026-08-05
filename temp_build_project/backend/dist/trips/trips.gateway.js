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
exports.TripsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const trip_location_entity_1 = require("./entities/trip-location.entity");
const trip_entity_1 = require("./entities/trip.entity");
let TripsGateway = class TripsGateway {
    constructor(tripLocationRepo, tripRepo) {
        this.tripLocationRepo = tripLocationRepo;
        this.tripRepo = tripRepo;
        this.userSockets = new Map();
    }
    handleConnection(client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            client.userId = userId;
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(client.id);
            client.join(`user:${userId}`);
        }
    }
    handleDisconnect(client) {
        const userId = client.userId;
        if (userId && this.userSockets.has(userId)) {
            this.userSockets.get(userId).delete(client.id);
            if (this.userSockets.get(userId).size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }
    async handleJoinTrip(client, data) {
        client.join(`trip:${data.tripId}`);
        return { event: 'track:joined', data: { tripId: data.tripId } };
    }
    async handleDriverLocation(client, data) {
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
    async handleStatusUpdate(client, data) {
        const trip = await this.tripRepo.findOne({ where: { id: data.tripId } });
        if (!trip)
            return;
        trip.status = data.status;
        if (data.status === 'accepted')
            trip.accepted_at = new Date();
        if (data.status === 'in_progress')
            trip.started_at = new Date();
        if (data.status === 'completed')
            trip.completed_at = new Date();
        if (data.status === 'cancelled')
            trip.cancelled_at = new Date();
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
    sendToUser(userId, event, data) {
        this.server.to(`user:${userId}`).emit(event, data);
    }
    sendToTrip(tripId, event, data) {
        this.server.to(`trip:${tripId}`).emit(event, data);
    }
};
exports.TripsGateway = TripsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TripsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('track:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TripsGateway.prototype, "handleJoinTrip", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('track:driver-location'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TripsGateway.prototype, "handleDriverLocation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('track:status-update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TripsGateway.prototype, "handleStatusUpdate", null);
exports.TripsGateway = TripsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/trips',
        cors: { origin: '*', credentials: true },
    }),
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(trip_location_entity_1.TripLocation)),
    __param(1, (0, typeorm_1.InjectRepository)(trip_entity_1.Trip)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], TripsGateway);
//# sourceMappingURL=trips.gateway.js.map