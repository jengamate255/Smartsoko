import { IsUUID, IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  user_id: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @IsIn(['general', 'trip', 'payment', 'promotion', 'system'])
  type?: string;

  @IsOptional()
  @IsUUID()
  reference_id?: string;
}
