import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { WorkSchedulesService } from './work-schedules.service';
import { CreateWorkScheduleDto, CreateWorkScheduleExceptionDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Controller('work-schedules')
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  @Post()
  async create(@Body() createWorkScheduleDto: CreateWorkScheduleDto) {
    try {
      return await this.workSchedulesService.create(createWorkScheduleDto);
    } catch (error) {
      console.error('Error creating work schedule:', error);
      throw new HttpException(
        error.message || 'Error creating work schedule',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  findAll() {
    return this.workSchedulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workSchedulesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkScheduleDto: UpdateWorkScheduleDto) {
    return this.workSchedulesService.update(id, updateWorkScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workSchedulesService.remove(id);
  }

  @Post('exceptions')
  createException(@Body() createExceptionDto: CreateWorkScheduleExceptionDto) {
    return this.workSchedulesService.createException(createExceptionDto);
  }
}
