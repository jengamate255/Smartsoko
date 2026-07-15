import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class ProcessPaymentDto {
  @IsUUID()
  trip_id: string;

  @IsUUID()
  payment_method_id: string;
}
