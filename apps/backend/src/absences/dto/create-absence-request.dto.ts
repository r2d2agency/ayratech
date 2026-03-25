export class CreateAbsenceRequestDto {
  employeeId: string;
  approverId?: string;
  type: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  reason?: string;
  employeeDocumentId?: string;
  fileUrl?: string;
  status?: string;
}
