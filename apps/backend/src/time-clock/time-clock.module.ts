import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeClockService } from './time-clock.service';
import { TimeClockController } from './time-clock.controller';
import { TimeClockEvent } from './entities/time-clock-event.entity';
import { TimeBalance } from './entities/time-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeClockEvent, TimeBalance])],
  controllers: [TimeClockController],
  providers: [TimeClockService],
  exports: [TimeClockService],
})
export class TimeClockModule {}
