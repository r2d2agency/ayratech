import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsBoolean()
  @IsOptional()
  waitForStockCount?: boolean;

  @IsString()
  @IsOptional()
  stockNotificationContact?: string;
}
