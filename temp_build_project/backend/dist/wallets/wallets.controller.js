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
exports.WalletsController = void 0;
const common_1 = require("@nestjs/common");
const wallets_service_1 = require("./wallets.service");
const deposit_dto_1 = require("./dto/deposit.dto");
const withdraw_dto_1 = require("./dto/withdraw.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let WalletsController = class WalletsController {
    constructor(walletsService) {
        this.walletsService = walletsService;
    }
    async getBalance(req) {
        return this.walletsService.getBalance(req.user['id']);
    }
    async deposit(req, dto) {
        return this.walletsService.deposit(req.user['id'], dto);
    }
    async withdraw(req, dto) {
        return this.walletsService.withdraw(req.user['id'], dto);
    }
    async getTransactions(req, page = '1', limit = '20') {
        return this.walletsService.getTransactions(req.user['id'], parseInt(page) || 1, parseInt(limit) || 20);
    }
};
exports.WalletsController = WalletsController;
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('deposit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, deposit_dto_1.DepositDto]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "deposit", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, withdraw_dto_1.WithdrawDto]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], WalletsController.prototype, "getTransactions", null);
exports.WalletsController = WalletsController = __decorate([
    (0, common_1.Controller)('wallets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [wallets_service_1.WalletsService])
], WalletsController);
//# sourceMappingURL=wallets.controller.js.map