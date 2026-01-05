import { IsString, IsDateString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateContractDto {
  @IsString()
  description: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  value: number;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
