import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { TimeClockEvent } from './entities/time-clock-event.entity';
import { TimeBalance } from './entities/time-balance.entity';
import { WorkSchedule } from '../work-schedules/entities/work-schedule.entity';
import { CreateTimeClockEventDto, CreateTimeBalanceDto } from './dto/create-time-clock.dto';
import { UpdateTimeClockEventDto } from './dto/update-time-clock.dto';

@Injectable()
export class TimeClockService {
  constructor(
    @InjectRepository(TimeClockEvent)
    private eventsRepository: Repository<TimeClockEvent>,
    @InjectRepository(TimeBalance)
    private balancesRepository: Repository<TimeBalance>,
    @InjectRepository(WorkSchedule)
    private schedulesRepository: Repository<WorkSchedule>,
  ) {}

  async generateReport(startDate?: string, endDate?: string, employeeId?: string) {
    const events = await this.findAll(startDate, endDate, employeeId);
    
    // Group by employee and date
    const groupedData = new Map<string, Map<string, TimeClockEvent[]>>();

    events.forEach(event => {
      const empId = event.employee.id;
      const dateKey = event.timestamp.toISOString().split('T')[0];
      
      if (!groupedData.has(empId)) {
        groupedData.set(empId, new Map());
      }
      
      const empDates = groupedData.get(empId);
      if (!empDates.has(dateKey)) {
        empDates.set(dateKey, []);
      }
      
      empDates.get(dateKey).push(event);
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Ponto');

    worksheet.columns = [
      { header: 'Funcionário', key: 'employee', width: 30 },
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Entrada', key: 'entry', width: 15 },
      { header: 'Início Almoço', key: 'lunchStart', width: 15 },
      { header: 'Fim Almoço', key: 'lunchEnd', width: 15 },
      { header: 'Saída', key: 'exit', width: 15 },
      { header: 'Total Horas', key: 'totalHours', width: 15 },
      { header: 'Observações', key: 'observations', width: 30 },
    ];

    groupedData.forEach((dates, empId) => {
      dates.forEach((dayEvents, dateKey) => {
        // Sort events by time
        dayEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        const entry = dayEvents.find(e => e.eventType === 'ENTRY');
        const lunchStart = dayEvents.find(e => e.eventType === 'LUNCH_START');
        const lunchEnd = dayEvents.find(e => e.eventType === 'LUNCH_END');
        const exit = dayEvents.find(e => e.eventType === 'EXIT');

        let totalMilliseconds = 0;
        let observations = [];

        if (dayEvents.some(e => e.isManual)) {
          observations.push('Contém ajustes manuais');
        }

        // Calculate hours
        if (entry && lunchStart) {
          totalMilliseconds += lunchStart.timestamp.getTime() - entry.timestamp.getTime();
        }
        if (lunchEnd && exit) {
          totalMilliseconds += exit.timestamp.getTime() - lunchEnd.timestamp.getTime();
        }
        // Fallback for continuous shift (Entry -> Exit)
        if (entry && exit && !lunchStart && !lunchEnd) {
          totalMilliseconds += exit.timestamp.getTime() - entry.timestamp.getTime();
        }

        const totalHours = totalMilliseconds > 0 ? (totalMilliseconds / (1000 * 60 * 60)).toFixed(2) : '0.00';

        // Format times
        const formatTime = (date?: Date) => date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';

        worksheet.addRow({
          employee: dayEvents[0].employee.fullName,
          date: new Date(dateKey).toLocaleDateString('pt-BR'),
          entry: formatTime(entry?.timestamp),
          lunchStart: formatTime(lunchStart?.timestamp),
          lunchEnd: formatTime(lunchEnd?.timestamp),
          exit: formatTime(exit?.timestamp),
          totalHours: totalHours,
          observations: observations.join(', ')
        });
      });
    });

    return workbook;
  }

  async create(createTimeClockEventDto: CreateTimeClockEventDto) {
    try {
      console.log('Creating time clock event via App:', JSON.stringify(createTimeClockEventDto));
      const { employeeId, timestamp, ...eventData } = createTimeClockEventDto;
      
      // Validate if employee exists/is provided
      if (!employeeId) {
          console.error('Create TimeClock: Employee ID is missing!');
          throw new BadRequestException('Employee ID is required');
      }

      // Ensure coords are numbers if provided
      if (eventData.latitude) eventData.latitude = Number(eventData.latitude);
      if (eventData.longitude) eventData.longitude = Number(eventData.longitude);

      console.log(`Saving event for employee: ${employeeId}`);

      // Explicitly construct the entity to avoid any ambiguity or pollution
      // and ensure relation is handled correctly by TypeORM
      const event = new TimeClockEvent();
      event.employee = { id: employeeId } as any; // Force relation assignment
      event.timestamp = new Date(timestamp);
      event.eventType = eventData.eventType;
      
      // Optional fields
      if (eventData.latitude !== undefined) event.latitude = eventData.latitude;
      if (eventData.longitude !== undefined) event.longitude = eventData.longitude;
      if (eventData.storeId) event.storeId = eventData.storeId;
      if (eventData.routeId) event.routeId = eventData.routeId;
      if (eventData.deviceId) event.deviceId = eventData.deviceId;
      if (eventData.facialPhotoUrl) event.facialPhotoUrl = eventData.facialPhotoUrl;
      
      event.validationStatus = eventData.validationStatus || 'pending';
      if (eventData.validationReason) event.validationReason = eventData.validationReason;

      const savedEvent = await this.eventsRepository.save(event);
      
      console.log('Time clock event saved:', savedEvent.id);
      return savedEvent;
    } catch (error) {
      console.error('Error saving time clock event:', error);
      // Return a more meaningful error if possible
      if (error.code === '23503') { // Foreign key violation
         throw new BadRequestException('Funcionário não encontrado ou inválido.');
      }
      if (error.code === '23502') { // Not null violation
         console.error('Not Null Violation Details:', error.detail, error.column);
         if (error.column === 'employeeId') {
             throw new BadRequestException(`Erro interno: ID do funcionário não processado corretamente (${employeeId}).`);
         }
      }
      throw error;
    }
  }

  async getTodayStatus(employeeId: string) {
    // FIX: Use Brazil Time (UTC-3) to determine "Today"
    // This prevents the "day reset" that happens at 21:00 Local (00:00 UTC)
    const now = new Date();
    // Adjust to UTC-3
    const brazilOffset = 3 * 60 * 60 * 1000; 
    const brazilTime = new Date(now.getTime() - brazilOffset);
    
    // Set to start of day (00:00:00) in Brazil Time (stored as UTC)
    brazilTime.setUTCHours(0, 0, 0, 0);
    
    // Convert back to real UTC for DB query
    // Start: 00:00 Local -> 03:00 UTC
    const start = new Date(brazilTime.getTime() + brazilOffset);
    
    // End: 23:59:59 Local -> 02:59:59 UTC Next Day
    const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);

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

    // Fetch Schedule for Today
    let scheduleRule = null;
    const allSchedules = await this.schedulesRepository.find({
        where: { employee: { id: employeeId } },
        relations: ['days'],
        order: { validFrom: 'DESC' }
    });

    const activeSchedule = allSchedules.find(s => {
        const start = new Date(s.validFrom);
        const end = s.validTo ? new Date(s.validTo) : new Date(9999, 11, 31);
        return now >= start && now <= end;
    });

    if (activeSchedule) {
        const dayOfWeek = now.getDay(); // 0-6
        const todayRule = activeSchedule.days.find(d => d.dayOfWeek === dayOfWeek && d.active);
        
        if (todayRule) {
            scheduleRule = {
                startTime: todayRule.startTime,
                endTime: todayRule.endTime,
                breakStart: todayRule.breakStart,
                breakEnd: todayRule.breakEnd,
                toleranceMinutes: todayRule.toleranceMinutes
            };
        }
    }

    return {
        events,
        nextAction,
        status,
        schedule: scheduleRule,
        summary: {
             entry: events.find(e => e.eventType === 'ENTRY')?.timestamp,
             lunchStart: events.find(e => e.eventType === 'LUNCH_START')?.timestamp,
             lunchEnd: events.find(e => e.eventType === 'LUNCH_END')?.timestamp,
             exit: events.find(e => e.eventType === 'EXIT')?.timestamp,
        }
    };
  }

  async createManual(data: any, editorName: string) {
    console.log('Creating manual time clock entry:', JSON.stringify(data));
    const { employeeId, timestamp, eventType, observation } = data;
    
    if (!employeeId) throw new BadRequestException('Employee ID is required');
    if (!timestamp) throw new BadRequestException('Timestamp is required');
    if (!eventType) throw new BadRequestException('Event Type is required');

    const eventDate = new Date(timestamp);
    if (isNaN(eventDate.getTime())) {
        throw new BadRequestException('Invalid timestamp format');
    }

    try {
        // Use explicit assignment to handle TypeORM relations correctly (insert: false columns)
        // Use save directly with object to match create() method pattern which works
        return await this.eventsRepository.save({
            employee: { id: employeeId },
            eventType,
            timestamp: eventDate,
            isManual: true,
            editedBy: editorName,
            validationReason: observation || 'Ajuste manual',
            validationStatus: 'approved'
        });
    } catch (error) {
        console.error('Error creating manual time clock entry:', error);
        console.error('Error details (code/message):', error.code, error.message);
        
        if (error.code === '23503') { // Foreign key violation
            throw new BadRequestException('Employee not found');
        }
        if (error.code === '22P02') { // Invalid text representation (e.g. invalid UUID)
             throw new BadRequestException('Invalid Employee ID format (must be UUID)');
        }
        throw new BadRequestException(`Error saving time clock: ${error.message}`);
    }
  }

  async findAll(startDate?: string, endDate?: string, employeeId?: string) {
    console.log(`Finding time clock events. Start: ${startDate}, End: ${endDate}, Employee: ${employeeId}`);
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
        // Adjust for timezone differences (extend end date to cover late entries in Western timezones)
        end.setHours(end.getHours() + 4);
        
        where.timestamp = Between(start, end);
    } else if (startDate) {
        // Just that day
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        const end = new Date(startDate);
        end.setHours(23,59,59,999);
        // Adjust for timezone differences
        end.setHours(end.getHours() + 4);
        where.timestamp = Between(start, end);
    }

    const results = await this.eventsRepository.find({ 
        where, 
        relations: ['employee'], 
        order: { timestamp: 'DESC' } 
    });
    console.log(`Found ${results.length} events.`);
    return results;
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
