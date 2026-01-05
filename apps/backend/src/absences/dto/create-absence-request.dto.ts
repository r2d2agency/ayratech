export class CreateAbsenceRequestDto {
  employeeId: string;
  type: string;
  startDate: Date;
  endDate?: Date;
  reason?: string;
  fileUrl?: string;
}
