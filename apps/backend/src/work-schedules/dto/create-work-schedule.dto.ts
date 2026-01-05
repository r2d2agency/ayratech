export class CreateWorkScheduleDto {
  employeeId: string;
  validFrom: Date;
  validTo?: Date;
  timezone?: string;
  weeklyHours?: number;
  days: CreateWorkScheduleDayDto[];
}

export class CreateWorkScheduleDayDto {
  dayOfWeek: number;
  active: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  toleranceMinutes?: number;
}

export class CreateWorkScheduleExceptionDto {
  employeeId: string;
  date: Date;
  type: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
