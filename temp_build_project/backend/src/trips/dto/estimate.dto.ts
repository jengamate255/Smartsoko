import { IsUUID, IsNumber, Min, Max } from 'class-validator';

export class EstimateDto {
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

  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoff_lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoff_lng: number;
}
