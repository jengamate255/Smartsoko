import { IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsUUID()
  user_id: string;

  @IsString()
  refresh_token: string;
}
