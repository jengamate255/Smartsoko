import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateDeliveryStatusDto {
  @IsString()
  @IsIn(['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status: string;
}
