import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbsenceRequest } from './entities/absence-request.entity';
import { CreateAbsenceRequestDto } from './dto/create-absence-request.dto';
import { UpdateAbsenceRequestDto } from './dto/update-absence-request.dto';

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(AbsenceRequest)
    private absencesRepository: Repository<AbsenceRequest>,
  ) {}

  create(createAbsenceRequestDto: CreateAbsenceRequestDto) {
    const { employeeId, approverId, ...absenceData } = createAbsenceRequestDto;
    const absence = this.absencesRepository.create({
        ...absenceData,
        employee: { id: employeeId },
        approver: approverId ? { id: approverId } : null
    });
    return this.absencesRepository.save(absence);
  }

  findAll() {
    return this.absencesRepository.find({ relations: ['employee', 'approver'] });
  }

  findOne(id: string) {
    return this.absencesRepository.findOne({ where: { id }, relations: ['employee', 'approver'] });
  }

  async update(id: string, updateAbsenceRequestDto: UpdateAbsenceRequestDto) {
    if (Object.keys(updateAbsenceRequestDto).length > 0) {
      await this.absencesRepository.update(id, updateAbsenceRequestDto);
    }
    return this.findOne(id);
  }

  remove(id: string) {
    return this.absencesRepository.delete(id);
  }
}
