import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { WorkSchedule } from './entities/work-schedule.entity';
import { WorkScheduleDay } from './entities/work-schedule-day.entity';
import { WorkScheduleException } from './entities/work-schedule-exception.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateWorkScheduleDto, CreateWorkScheduleExceptionDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Injectable()
export class WorkSchedulesService {
  constructor(
    @InjectRepository(WorkSchedule)
    private schedulesRepository: Repository<WorkSchedule>,
    @InjectRepository(WorkScheduleDay)
    private daysRepository: Repository<WorkScheduleDay>,
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
    let days = [];
    if (scheduleData.days) {
        days = scheduleData.days.map(day => ({
            ...day,
            active: !!day.active,
            startTime: day.startTime || '08:00',
            endTime: day.endTime || '17:00',
            breakStart: day.breakStart ? day.breakStart : null,
            breakEnd: day.breakEnd ? day.breakEnd : null,
            toleranceMinutes: Number(day.toleranceMinutes) || 0,
        }));
    }
    
    const employee = await this.employeesRepository.findOneBy({ id: employeeId });
    if (!employee) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    try {
      // Create and save schedule first without days
      const schedule = this.schedulesRepository.create({
        ...scheduleData,
        days: [], // Explicitly empty days
      });
      schedule.employee = employee;
      
      const savedSchedule = await this.schedulesRepository.save(schedule);

      if (!savedSchedule || !savedSchedule.id) {
          throw new Error('Failed to save schedule parent entity');
      }

      // Now create and save days associated with the schedule
      // This avoids cascade issues and ensures proper relation setting
      if (days.length > 0) {
        const daysEntities: WorkScheduleDay[] = days.map(dayData => {
            const day = new WorkScheduleDay();
            day.dayOfWeek = dayData.dayOfWeek;
            day.active = dayData.active;
            day.startTime = dayData.startTime;
            day.endTime = dayData.endTime;
            // Ensure strict null for optional fields
            day.breakStart = dayData.breakStart || null;
            day.breakEnd = dayData.breakEnd || null;
            day.toleranceMinutes = dayData.toleranceMinutes;
            day.workSchedule = savedSchedule;
            return day;
        });
        
        await this.daysRepository.save(daysEntities);
      }
      
      // Re-fetch the schedule with days to return complete object
      return this.schedulesRepository.findOne({ 
          where: { id: savedSchedule.id },
          relations: ['days', 'employee']
      });
    } catch (error) {
        console.error('Detailed Error in WorkSchedulesService.create:', error);
        // Throwing error will be caught by controller
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
