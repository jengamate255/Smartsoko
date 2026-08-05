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
exports.DeliveriesController = void 0;
const common_1 = require("@nestjs/common");
const deliveries_service_1 = require("./deliveries.service");
const create_delivery_dto_1 = require("./dto/create-delivery.dto");
const update_delivery_status_dto_1 = require("./dto/update-delivery-status.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let DeliveriesController = class DeliveriesController {
    constructor(deliveriesService) {
        this.deliveriesService = deliveriesService;
    }
    async create(req, dto) {
        return this.deliveriesService.create(req.user['id'], dto);
    }
    async available(page = '1', limit = '20') {
        return this.deliveriesService.getAvailable(parseInt(page) || 1, parseInt(limit) || 20);
    }
    async accept(req, id) {
        return this.deliveriesService.accept(id, req.user['id']);
    }
    async reject(req, id) {
        return this.deliveriesService.reject(id, req.user['id']);
    }
    async updateStatus(req, id, dto) {
        return this.deliveriesService.updateStatus(id, req.user['id'], dto);
    }
    async getActive(req) {
        const active = await this.deliveriesService.getActive(req.user['id']);
        return active || null;
    }
    async history(req, page = '1', limit = '20') {
        return this.deliveriesService.getHistory(req.user['id'], parseInt(page) || 1, parseInt(limit) || 20);
    }
};
exports.DeliveriesController = DeliveriesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_delivery_dto_1.CreateDeliveryDto]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('available'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "available", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "reject", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_delivery_status_dto_1.UpdateDeliveryStatusDto]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "getActive", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "history", null);
exports.DeliveriesController = DeliveriesController = __decorate([
    (0, common_1.Controller)('deliveries'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [deliveries_service_1.DeliveriesService])
], DeliveriesController);
//# sourceMappingURL=deliveries.controller.js.map