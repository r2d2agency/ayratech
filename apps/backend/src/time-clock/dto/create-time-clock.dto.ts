import { IsString, IsUUID, IsOptional, IsDateString, IsNumber, IsEnum } from 'class-validator';

export class CreateTimeClockEventDto {
  @IsUUID()
  @IsOptional() // Optional because it might be set from token
  employeeId: string;

  @IsString()
  eventType: string;

  @IsDateString()
  timestamp: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  routeId?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  facialPhotoUrl?: string;

  @IsString()
  @IsOptional()
  validationStatus?: string;

  @IsString()
  @IsOptional()
  validationReason?: string;
}

export class CreateManualTimeClockDto {
  @IsString() // Relaxed from IsUUID to avoid false positives
  employeeId: string;

  @IsString()
  eventType: string;

  @IsString() // Relaxed from IsDateString to allow service to validate
  timestamp: string;

  @IsString()
  @IsOptional()
  observation?: string;
}

export class CreateTimeBalanceDto {
  employeeId: string;
  competence: string;
  expectedHours: number;
  workedHours: number;
  overtimeHours: number;
  balanceHours: number;
}
