import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

  @Get('client/all')
  findAllByClient(@Req() req: any) {
    if (req.user.role !== 'client') throw new UnauthorizedException();
    const id = req.user.clientId || req.user.userId || req.user.sub;
    if (!id) throw new UnauthorizedException('Client ID not found in token');
    return this.routesService.findByClient(id);
  }

  @Get('client/supermarkets')
  findClientSupermarkets(@Req() req: any) {
    if (req.user.role !== 'client') throw new UnauthorizedException();
    const id = req.user.clientId || req.user.userId || req.user.sub;
    console.log('RoutesController.findClientSupermarkets user:', JSON.stringify(req.user), 'extracted id:', id);
    if (!id) throw new BadRequestException('Client ID not found in token');
    return this.routesService.findClientSupermarkets(id);
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
  update(@Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto, @Req() req: any) {
    return this.routesService.update(id, updateRouteDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.routesService.remove(id, req.user);
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
    @Body() body: { checked?: boolean; observation?: string; isStockout?: boolean; stockoutType?: string; photos?: string[]; checkInTime?: string; checkOutTime?: string; validityDate?: string },
  ) {
    return this.routesService.checkProduct(itemId, productId, body);
  }

  @Post('items/:itemId/manual-execution')
  manualExecution(
    @Param('itemId') itemId: string,
    @Body() body: { 
      checkInTime: string; 
      checkOutTime: string; 
      promoterId?: string;
      products: { 
        productId: string; 
        checked: boolean; 
        isStockout: boolean; 
        observation?: string; 
        photos?: string[] 
      }[] 
    },
    @Req() req: any
  ) {
    return this.routesService.manualExecution(itemId, body, req.user);
  }

  @Post('items/:itemId/check-in')
  checkIn(@Param('itemId') itemId: string, @Body() body: { lat: number; lng: number; timestamp: string }) {
    return this.routesService.checkIn(itemId, body);
  }

  @Post('items/:itemId/check-out')
  checkOut(@Param('itemId') itemId: string, @Body() body: { lat: number; lng: number; timestamp: string }) {
    return this.routesService.checkOut(itemId, body);
  }
}
