import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { CreateAbsenceRequestDto } from './dto/create-absence-request.dto';
import { UpdateAbsenceRequestDto } from './dto/update-absence-request.dto';

@Controller('absences')
export class AbsencesController {
  constructor(private readonly absencesService: AbsencesService) {}

  @Post()
  create(@Body() createAbsenceRequestDto: CreateAbsenceRequestDto) {
    return this.absencesService.create(createAbsenceRequestDto);
  }

  @Get()
  findAll() {
    return this.absencesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.absencesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAbsenceRequestDto: UpdateAbsenceRequestDto) {
    return this.absencesService.update(id, updateAbsenceRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.absencesService.remove(id);
  }
}
