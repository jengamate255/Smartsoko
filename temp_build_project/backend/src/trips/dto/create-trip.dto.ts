import { IsUUID, IsString, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreateTripDto {
  @IsUUID()
  service_type_id: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  pickup_lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  pickup_lng: number;

  @IsString()
  pickup_address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoff_lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoff_lng: number;

  @IsString()
  dropoff_address: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  payment_method?: string;
}
