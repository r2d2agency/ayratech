import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  create(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.create(createRouteDto);
  }

  @Get()
  findAll() {
    return this.routesService.findAll();
  }

  @Get('templates/all')
  findTemplates() {
    return this.routesService.findTemplates();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Body() body: { date: string; promoterId?: string }) {
    return this.routesService.duplicate(id, body.date, body.promoterId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto) {
    return this.routesService.update(id, updateRouteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }

  // Rules Endpoints
  @Post('rules')
  createRule(@Body() rule: any) {
    return this.routesService.createRule(rule);
  }

  @Get('rules/all')
  findAllRules() {
    return this.routesService.findAllRules();
  }

  @Patch('items/:itemId/products/:productId/check')
  checkProduct(
    @Param('itemId') itemId: string,
    @Param('productId') productId: string,
    @Body() body: { checked?: boolean; observation?: string; isStockout?: boolean; stockoutType?: string; photos?: string[] },
  ) {
    return this.routesService.checkProduct(itemId, productId, body);
  }
}
