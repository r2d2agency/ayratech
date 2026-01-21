import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeClockService } from './time-clock.service';
import { TimeClockController } from './time-clock.controller';
import { TimeClockEvent } from './entities/time-clock-event.entity';
import { TimeBalance } from './entities/time-balance.entity';
import { Employee } from '../employees/entities/employee.entity';
import { WorkSchedule } from '../work-schedules/entities/work-schedule.entity';
import { TimeClockGateway } from './time-clock.gateway';
import { TimeClockMonitorService } from './time-clock-monitor.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeClockEvent, TimeBalance, Employee, WorkSchedule])],
  controllers: [TimeClockController],
  providers: [TimeClockService, TimeClockGateway, TimeClockMonitorService],
  exports: [TimeClockService],
})
export class TimeClockModule {}
