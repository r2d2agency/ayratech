import { PartialType } from '@nestjs/mapped-types';
import { CreateAbsenceRequestDto } from './create-absence-request.dto';

export class UpdateAbsenceRequestDto extends PartialType(CreateAbsenceRequestDto) {
  status?: string;
  approverId?: string;
  approvedAt?: Date;
}
