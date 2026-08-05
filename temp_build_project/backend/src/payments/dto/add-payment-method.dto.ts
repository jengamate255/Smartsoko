import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class AddPaymentMethodDto {
  @IsString()
  @IsIn(['card', 'mobile_money', 'bank'])
  type: string;

  @IsString()
  @MaxLength(50)
  provider: string;

  @IsString()
  @MaxLength(100)
  identifier: string;

  @IsOptional()
  is_default?: boolean;
}
