import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @IsBoolean()
  @IsOptional()
  waitForStockCount?: boolean;

  @IsString()
  @IsOptional()
  stockNotificationContact?: string;
}
