import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TimeClockEvent } from './entities/time-clock-event.entity';
import { TimeBalance } from './entities/time-balance.entity';
import { CreateTimeClockEventDto, CreateTimeBalanceDto } from './dto/create-time-clock.dto';
import { UpdateTimeClockEventDto } from './dto/update-time-clock.dto';

@Injectable()
export class TimeClockService {
  constructor(
    @InjectRepository(TimeClockEvent)
    private eventsRepository: Repository<TimeClockEvent>,
    @InjectRepository(TimeBalance)
    private balancesRepository: Repository<TimeBalance>,
  ) {}

  async create(createTimeClockEventDto: CreateTimeClockEventDto) {
    const { employeeId, ...eventData } = createTimeClockEventDto;
    
    // Validate if employee exists/is provided
    if (!employeeId) {
        throw new BadRequestException('Employee ID is required');
    }

    const event = this.eventsRepository.create({
        ...eventData,
        employee: { id: employeeId }
    });
    return this.eventsRepository.save(event);
  }

  async getTodayStatus(employeeId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const events = await this.eventsRepository.find({
        where: {
            employee: { id: employeeId },
            timestamp: Between(start, end)
        },
        order: { timestamp: 'ASC' }
    });

    // Determine next expected action
    let nextAction = 'ENTRY';
    let status = 'PENDING'; // PENDING | WORKING | LUNCH | DONE

    if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        switch (lastEvent.eventType) {
            case 'ENTRY': 
                nextAction = 'LUNCH_START'; 
                status = 'WORKING';
                break;
            case 'LUNCH_START': 
                nextAction = 'LUNCH_END'; 
                status = 'LUNCH';
                break;
            case 'LUNCH_END': 
                nextAction = 'EXIT'; 
                status = 'WORKING';
                break;
            case 'EXIT': 
                nextAction = 'DONE'; 
                status = 'DONE';
                break;
        }
    }

    return {
        events,
        nextAction,
        status,
        summary: {
             entry: events.find(e => e.eventType === 'ENTRY')?.timestamp,
             lunchStart: events.find(e => e.eventType === 'LUNCH_START')?.timestamp,
             lunchEnd: events.find(e => e.eventType === 'LUNCH_END')?.timestamp,
             exit: events.find(e => e.eventType === 'EXIT')?.timestamp,
        }
    };
  }

  async createManual(data: any, editorName: string) {
    const { employeeId, timestamp, eventType, observation } = data;
    
    if (!employeeId) throw new BadRequestException('Employee ID is required');

    const event = this.eventsRepository.create({
        employee: { id: employeeId },
        eventType,
        timestamp: new Date(timestamp),
        isManual: true,
        editedBy: editorName,
        validationReason: observation || 'Ajuste manual',
        validationStatus: 'approved' // Manual edits are auto-approved usually
    });

    return this.eventsRepository.save(event);
  }

  async findAll(startDate?: string, endDate?: string, employeeId?: string) {
    const where: any = {};
    
    if (employeeId) {
        where.employee = { id: employeeId };
    }

    if (startDate && endDate) {
        // Ensure dates cover the full day range if strings are passed
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        
        where.timestamp = Between(start, end);
    } else if (startDate) {
        // Just that day
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        const end = new Date(startDate);
        end.setHours(23,59,59,999);
        where.timestamp = Between(start, end);
    }

    return this.eventsRepository.find({ 
        where, 
        relations: ['employee'], 
        order: { timestamp: 'DESC' } 
    });
  }

  findOne(id: string) {
    return this.eventsRepository.findOne({ where: { id }, relations: ['employee'] });
  }

  update(id: string, updateTimeClockEventDto: UpdateTimeClockEventDto) {
    return this.eventsRepository.update(id, updateTimeClockEventDto);
  }

  remove(id: string) {
    return this.eventsRepository.delete(id);
  }

  createBalance(createBalanceDto: CreateTimeBalanceDto) {
    const balance = this.balancesRepository.create(createBalanceDto);
    return this.balancesRepository.save(balance);
  }
}
