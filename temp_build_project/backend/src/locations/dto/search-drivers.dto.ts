import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class SearchDriversDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius_meters?: number = 3000;
}
