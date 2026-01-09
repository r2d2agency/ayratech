import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  create(createTimeClockEventDto: CreateTimeClockEventDto) {
    const { employeeId, ...eventData } = createTimeClockEventDto;
    const event = this.eventsRepository.create({
        ...eventData,
        employee: { id: employeeId }
    });
    return this.eventsRepository.save(event);
  }

  findAll() {
    return this.eventsRepository.find({ relations: ['employee'] });
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
