export class CreateAbsenceRequestDto {
  employeeId: string;
  approverId?: string;
  type: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  reason?: string;
  medicalCid?: string;
  medicalProfessionalName?: string;
  medicalServiceLocation?: string;
  medicalLicenseType?: string;
  medicalLicenseNumber?: string;
  employeeDocumentId?: string;
  fileUrl?: string;
  status?: string;
}
