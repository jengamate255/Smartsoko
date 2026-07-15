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
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const trips_service_1 = require("./trips.service");
const estimate_dto_1 = require("./dto/estimate.dto");
const create_trip_dto_1 = require("./dto/create-trip.dto");
const cancel_trip_dto_1 = require("./dto/cancel-trip.dto");
const service_type_entity_1 = require("./entities/service-type.entity");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let TripsController = class TripsController {
    constructor(tripsService, serviceTypeRepo) {
        this.tripsService = tripsService;
        this.serviceTypeRepo = serviceTypeRepo;
    }
    async getServiceTypes() {
        return this.serviceTypeRepo.find({ where: { is_active: true } });
    }
    async estimate(dto) {
        return this.tripsService.estimatePrice(dto);
    }
    async create(req, dto) {
        return this.tripsService.createTrip(req.user['id'], dto);
    }
    async list(req, page = '1', limit = '20') {
        return this.tripsService.getCustomerTrips(req.user['id'], parseInt(page) || 1, parseInt(limit) || 20);
    }
    async getActive(req) {
        const active = await this.tripsService.getActiveTrip(req.user['id']);
        return active || null;
    }
    async getById(req, id) {
        return this.tripsService.getTripById(id, req.user['id']);
    }
    async cancel(req, id, dto) {
        return this.tripsService.cancelTrip(id, req.user['id'], dto);
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, common_1.Get)('services'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getServiceTypes", null);
__decorate([
    (0, common_1.Post)('trips/estimate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [estimate_dto_1.EstimateDto]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "estimate", null);
__decorate([
    (0, common_1.Post)('trips'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_trip_dto_1.CreateTripDto]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('trips'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('trips/active'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getActive", null);
__decorate([
    (0, common_1.Get)('trips/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)('trips/:id/cancel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cancel_trip_dto_1.CancelTripDto]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "cancel", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(1, (0, typeorm_1.InjectRepository)(service_type_entity_1.ServiceType)),
    __metadata("design:paramtypes", [trips_service_1.TripsService,
        typeorm_2.Repository])
], TripsController);
//# sourceMappingURL=trips.controller.js.map