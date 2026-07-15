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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const process_payment_dto_1 = require("./dto/process-payment.dto");
const add_payment_method_dto_1 = require("./dto/add-payment-method.dto");
const refund_payment_dto_1 = require("./dto/refund-payment.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async processPayment(req, dto) {
        return this.paymentsService.processPayment(req.user['id'], dto);
    }
    async refundPayment(req, dto) {
        return this.paymentsService.refundPayment(req.user['id'], dto);
    }
    async getPaymentMethods(req) {
        return this.paymentsService.getPaymentMethods(req.user['id']);
    }
    async addPaymentMethod(req, dto) {
        return this.paymentsService.addPaymentMethod(req.user['id'], dto);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('process'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, process_payment_dto_1.ProcessPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "processPayment", null);
__decorate([
    (0, common_1.Post)('refund'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, refund_payment_dto_1.RefundPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "refundPayment", null);
__decorate([
    (0, common_1.Get)('methods'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Post)('methods'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_payment_method_dto_1.AddPaymentMethodDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "addPaymentMethod", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map