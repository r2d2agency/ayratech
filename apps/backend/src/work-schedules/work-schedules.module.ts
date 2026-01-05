import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSchedulesService } from './work-schedules.service';
import { WorkSchedulesController } from './work-schedules.controller';
import { WorkSchedule } from './entities/work-schedule.entity';
import { WorkScheduleDay } from './entities/work-schedule-day.entity';
import { WorkScheduleException } from './entities/work-schedule-exception.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSchedule, WorkScheduleDay, WorkScheduleException])],
  controllers: [WorkSchedulesController],
  providers: [WorkSchedulesService],
  exports: [WorkSchedulesService],
})
export class WorkSchedulesModule {}
