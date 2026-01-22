import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { WorkSchedule } from './entities/work-schedule.entity';
import { WorkScheduleException } from './entities/work-schedule-exception.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateWorkScheduleDto, CreateWorkScheduleExceptionDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Injectable()
export class WorkSchedulesService {
  constructor(
    @InjectRepository(WorkSchedule)
    private schedulesRepository: Repository<WorkSchedule>,
    @InjectRepository(WorkScheduleException)
    private exceptionsRepository: Repository<WorkScheduleException>,
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
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

    const { employeeId, ...scheduleData } = createWorkScheduleDto;

    // Sanitize days to ensure empty strings for time fields become null
    if (scheduleData.days) {
        scheduleData.days = scheduleData.days.map(day => ({
            ...day,
            active: !!day.active,
            startTime: day.startTime || '08:00',
            endTime: day.endTime || '17:00',
            breakStart: day.breakStart ? day.breakStart : null,
            breakEnd: day.breakEnd ? day.breakEnd : null,
            toleranceMinutes: Number(day.toleranceMinutes) || 0,
        })) as any;
    }
    
    const employee = await this.employeesRepository.findOneBy({ id: employeeId });
    if (!employee) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    try {
      const schedule = this.schedulesRepository.create({
        ...scheduleData,
      });
      schedule.employee = employee;
      
      return await this.schedulesRepository.save(schedule);
    } catch (error) {
      console.error('Error saving work schedule:', error);
      throw error;
    }
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

  async createException(createExceptionDto: CreateWorkScheduleExceptionDto) {
    const { employeeId, ...exceptionData } = createExceptionDto;

    const employee = await this.employeesRepository.findOneBy({ id: employeeId });
    if (!employee) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const exception = this.exceptionsRepository.create({
        ...exceptionData,
    });
    exception.employee = employee;
    return this.exceptionsRepository.save(exception);
  }
}
