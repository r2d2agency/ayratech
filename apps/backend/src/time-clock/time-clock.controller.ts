import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException, Query } from '@nestjs/common';
import { TimeClockService } from './time-clock.service';
import { CreateTimeClockEventDto, CreateTimeBalanceDto } from './dto/create-time-clock.dto';
import { UpdateTimeClockEventDto } from './dto/update-time-clock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('time-clock')
export class TimeClockController {
  constructor(private readonly timeClockService: TimeClockService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createTimeClockEventDto: CreateTimeClockEventDto, @Req() req: any) {
    if (!req.user?.employee?.id) {
        throw new BadRequestException('Usuário não vinculado a um funcionário. Contate o RH.');
    }
    return this.timeClockService.create({
        ...createTimeClockEventDto,
        employeeId: req.user.employee.id
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/today')
  getTodayStatus(@Req() req: any) {
    if (!req.user?.employee?.id) {
        throw new BadRequestException('Usuário não vinculado a um funcionário. Contate o RH.');
    }
    return this.timeClockService.getTodayStatus(req.user.employee.id);
  }

  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string
  ) {
    return this.timeClockService.findAll(startDate, endDate, employeeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('manual')
  createManual(@Body() data: any, @Req() req: any) {
     const editorName = req.user?.name || req.user?.email || 'Admin';
     return this.timeClockService.createManual(data, editorName);
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
