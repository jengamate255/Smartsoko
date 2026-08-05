import { IsString, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  is_favorite?: boolean;
}
