export class CreateTimeClockEventDto {
  employeeId: string;
  eventType: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  storeId?: string;
  routeId?: string;
  deviceId?: string;
  facialPhotoUrl?: string;
  validationStatus?: string;
  validationReason?: string;
}

export class CreateTimeBalanceDto {
  employeeId: string;
  competence: string;
  expectedHours: number;
  workedHours: number;
  overtimeHours: number;
  balanceHours: number;
}
