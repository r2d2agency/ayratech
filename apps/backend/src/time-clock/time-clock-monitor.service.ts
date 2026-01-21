import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { TimeClockEvent } from './entities/time-clock-event.entity';
import { WorkSchedule } from '../work-schedules/entities/work-schedule.entity';
import { TimeClockGateway } from './time-clock.gateway';

@Injectable()
export class TimeClockMonitorService {
  private readonly logger = new Logger(TimeClockMonitorService.name);

  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(TimeClockEvent)
    private eventRepository: Repository<TimeClockEvent>,
    private timeClockGateway: TimeClockGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeClockCompliance() {
    this.logger.debug('Checking time clock compliance...');
    
    const employees = await this.employeeRepository.find({
      where: { status: 'active' },
      relations: ['workSchedules', 'workSchedules.days'],
    });

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); // HH:MM
    const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    for (const employee of employees) {
      const schedule = this.getActiveSchedule(employee.workSchedules, now);
      if (!schedule) continue;

      const daySchedule = schedule.days.find(d => d.dayOfWeek === dayOfWeek && d.active);
      if (!daySchedule) continue;

      // Fetch today's events
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);
      
      const events = await this.eventRepository.find({
        where: {
          employee: { id: employee.id },
          timestamp: Between(todayStart, todayEnd)
        }
      });

      // Check Entry
      this.checkEvent(
        employee, 
        daySchedule.startTime, 
        daySchedule.toleranceMinutes, 
        events, 
        'ENTRY', 
        'Entrada',
        currentTotalMinutes
      );

      // Check Lunch Start
      if (daySchedule.breakStart) {
        this.checkEvent(
            employee,
            daySchedule.breakStart,
            daySchedule.toleranceMinutes,
            events,
            'LUNCH_START',
            'Saída para Almoço',
            currentTotalMinutes
        );
      }

      // Check Lunch End
      if (daySchedule.breakEnd) {
        this.checkEvent(
            employee,
            daySchedule.breakEnd,
            daySchedule.toleranceMinutes,
            events,
            'LUNCH_END',
            'Volta do Almoço',
            currentTotalMinutes
        );
      }

       // Check Exit (Optional, usually we check if they are still working way past exit time)
       // Keeping simple for now based on request "if he doesn't punch... warning"
    }
  }

  private getActiveSchedule(schedules: WorkSchedule[], date: Date) {
    if (!schedules) return null;
    return schedules.find(s => {
      const start = new Date(s.validFrom);
      const end = s.validTo ? new Date(s.validTo) : new Date(9999, 11, 31);
      return date >= start && date <= end;
    });
  }

  private checkEvent(
    employee: Employee, 
    scheduledTime: string, 
    tolerance: number, 
    events: TimeClockEvent[], 
    eventType: string, 
    label: string,
    currentTotalMinutes: number
  ) {
    const [schedHour, schedMinute] = scheduledTime.split(':').map(Number);
    const schedTotalMinutes = schedHour * 60 + schedMinute;
    const limitTotalMinutes = schedTotalMinutes + tolerance;

    // Has event?
    const hasEvent = events.some(e => e.eventType === eventType);

    if (!hasEvent && currentTotalMinutes > limitTotalMinutes) {
        // LATE!
        const delayMinutes = currentTotalMinutes - schedTotalMinutes;
        
        // Determine if Online or Offline (using lastLocationAt as proxy for activity)
        // If lastLocationAt is within 15 mins, consider Online.
        const lastSeen = employee.lastLocationAt ? new Date(employee.lastLocationAt).getTime() : 0;
        const now = new Date().getTime();
        const diffMinutes = (now - lastSeen) / 1000 / 60;

        const alertData = {
            employeeId: employee.id,
            employeeName: employee.fullName,
            type: eventType,
            label: label,
            scheduledTime,
            delayMinutes,
            isOnline: diffMinutes <= 15
        };

        if (alertData.isOnline) {
            // Notify Employee
            this.timeClockGateway.sendAlertToEmployee(employee.id, {
                title: 'Hora de Bater o Ponto!',
                message: `Você deveria ter registrado ${label} às ${scheduledTime}.`,
                severity: 'warning'
            });
            // Also notify HR if very late?
        } else {
            // Offline - Notify HR/Supervisor
            this.timeClockGateway.sendAlertToHR({
                ...alertData,
                message: `Funcionário ${employee.fullName} não registrou ${label} (marcado para ${scheduledTime}). Status: Offline/Sem resposta.`
            });
        }
    }
  }
}
