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
    const absence = this.absencesRepository.create(createAbsenceRequestDto);
    return this.absencesRepository.save(absence);
  }

  findAll() {
    return this.absencesRepository.find({ relations: ['employee', 'approver'] });
  }

  findOne(id: string) {
    return this.absencesRepository.findOne({ where: { id }, relations: ['employee', 'approver'] });
  }

  update(id: string, updateAbsenceRequestDto: UpdateAbsenceRequestDto) {
    return this.absencesRepository.update(id, updateAbsenceRequestDto);
  }

  remove(id: string) {
    return this.absencesRepository.delete(id);
  }
}
