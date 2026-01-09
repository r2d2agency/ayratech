import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { WorkSchedule } from './entities/work-schedule.entity';
import { WorkScheduleException } from './entities/work-schedule-exception.entity';
import { CreateWorkScheduleDto, CreateWorkScheduleExceptionDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Injectable()
export class WorkSchedulesService {
  constructor(
    @InjectRepository(WorkSchedule)
    private schedulesRepository: Repository<WorkSchedule>,
    @InjectRepository(WorkScheduleException)
    private exceptionsRepository: Repository<WorkScheduleException>,
  ) {}

  async create(createWorkScheduleDto: CreateWorkScheduleDto) {
    // Close previous active schedule
    const previousSchedule = await this.schedulesRepository.findOne({
      where: { 
        employeeId: createWorkScheduleDto.employeeId,
        validTo: IsNull()
      },
      order: { validFrom: 'DESC' }
    });

    if (previousSchedule) {
      const newStart = new Date(createWorkScheduleDto.validFrom);
      const prevEnd = new Date(newStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      
      await this.schedulesRepository.update(previousSchedule.id, {
        validTo: prevEnd
      });
    }

    const schedule = this.schedulesRepository.create(createWorkScheduleDto);
    return this.schedulesRepository.save(schedule);
  }

  findAll() {
    return this.schedulesRepository.find({ relations: ['days', 'employee'] });
  }

  findOne(id: string) {
    return this.schedulesRepository.findOne({ where: { id }, relations: ['days', 'employee'] });
  }

  update(id: string, updateWorkScheduleDto: UpdateWorkScheduleDto) {
    return this.schedulesRepository.update(id, updateWorkScheduleDto);
  }

  remove(id: string) {
    return this.schedulesRepository.delete(id);
  }

  createException(createExceptionDto: CreateWorkScheduleExceptionDto) {
    const exception = this.exceptionsRepository.create(createExceptionDto);
    return this.exceptionsRepository.save(exception);
  }
}
