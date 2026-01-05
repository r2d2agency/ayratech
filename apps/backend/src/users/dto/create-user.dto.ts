import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password?: string; // Optional because it might be set by default or handled separately

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;
}
