import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { BreakagesService } from './breakages.service';
import { CreateBreakageDto } from './dto/create-breakage.dto';
import { UpdateBreakageDto } from './dto/update-breakage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('breakages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BreakagesController {
  constructor(private readonly breakagesService: BreakagesService) {}

  @Post()
  @Roles('promoter', 'promotor', 'supervisor', 'admin', 'administrador', 'user')
  create(@Request() req, @Body() createBreakageDto: CreateBreakageDto) {
    return this.breakagesService.create(req.user.id, createBreakageDto);
  }

  @Get()
  findAll(@Request() req, @Query() query) {
    return this.breakagesService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.breakagesService.findOne(id);
  }

  @Patch('invoice')
  @Roles('promoter', 'promotor', 'supervisor', 'admin', 'administrador')
  updateInvoice(@Body() updateDto: { ids: string[], invoiceData: UpdateBreakageDto }) {
    return this.breakagesService.updateInvoice(updateDto.ids, updateDto.invoiceData);
  }
}
