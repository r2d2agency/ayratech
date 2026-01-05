import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TimeClockService } from './time-clock.service';
import { CreateTimeClockEventDto, CreateTimeBalanceDto } from './dto/create-time-clock.dto';
import { UpdateTimeClockEventDto } from './dto/update-time-clock.dto';

@Controller('time-clock')
export class TimeClockController {
  constructor(private readonly timeClockService: TimeClockService) {}

  @Post()
  create(@Body() createTimeClockEventDto: CreateTimeClockEventDto) {
    return this.timeClockService.create(createTimeClockEventDto);
  }

  @Get()
  findAll() {
    return this.timeClockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeClockService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTimeClockEventDto: UpdateTimeClockEventDto) {
    return this.timeClockService.update(id, updateTimeClockEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timeClockService.remove(id);
  }

  @Post('balances')
  createBalance(@Body() createBalanceDto: CreateTimeBalanceDto) {
    return this.timeClockService.createBalance(createBalanceDto);
  }
}
