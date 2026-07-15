import { IsString, IsNumber, IsArray, IsOptional, Min, Max, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class DeliveryItem {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDeliveryDto {
  @IsString()
  pickup_name: string;

  @IsString()
  pickup_address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  pickup_lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  pickup_lng: number;

  @IsString()
  dropoff_name: string;

  @IsString()
  dropoff_address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoff_lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoff_lng: number;

  @IsString()
  customer_name: string;

  @IsString()
  customer_phone: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryItem)
  items: DeliveryItem[];

  @IsNumber()
  @Min(0)
  total_amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_distance?: number;

  @IsOptional()
  @IsString()
  estimated_duration?: string;

  @IsOptional()
  @IsString()
  delivery_instructions?: string;
}
