import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundPaymentDto {
  @IsUUID()
  trip_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
