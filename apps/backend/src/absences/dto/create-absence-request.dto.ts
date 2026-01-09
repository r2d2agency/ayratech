export class CreateAbsenceRequestDto {
  employeeId: string;
  approverId?: string;
  type: string;
  startDate: Date;
  endDate?: Date;
  reason?: string;
  fileUrl?: string;
}
