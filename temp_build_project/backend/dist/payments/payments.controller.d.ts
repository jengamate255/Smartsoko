import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Request } from 'express';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    processPayment(req: Request, dto: ProcessPaymentDto): Promise<{
        success: boolean;
        trip_id: string;
        amount: number;
        payment_method: string;
        message: string;
    }>;
    refundPayment(req: Request, dto: RefundPaymentDto): Promise<{
        success: boolean;
        trip_id: string;
        amount: number;
        message: string;
    }>;
    getPaymentMethods(req: Request): Promise<import("./entities/payment-method.entity").PaymentMethod[]>;
    addPaymentMethod(req: Request, dto: AddPaymentMethodDto): Promise<import("./entities/payment-method.entity").PaymentMethod>;
}
