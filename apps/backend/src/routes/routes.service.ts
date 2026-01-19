import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteItem } from './entities/route-item.entity';
import { RouteItemProduct } from './entities/route-item-product.entity';
import { RouteRule } from './entities/route-rule.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
    @InjectRepository(RouteItem)
    private routeItemsRepository: Repository<RouteItem>,
    @InjectRepository(RouteItemProduct)
    private routeItemProductsRepository: Repository<RouteItemProduct>,
    @InjectRepository(RouteRule)
    private routeRulesRepository: Repository<RouteRule>,
    private dataSource: DataSource,
  ) {}

  async create(createRouteDto: CreateRouteDto) {
    console.log('RoutesService.create input:', JSON.stringify(createRouteDto));
    const { items, ...routeData } = createRouteDto;
    
    const route = this.routesRepository.create({
      ...routeData,
      promoterId: routeData.promoterId,
      promoter: routeData.promoterId ? { id: routeData.promoterId } : null,
    });
    console.log('RoutesService.create entity before save:', JSON.stringify(route));
    
    const savedRoute = await this.routesRepository.save(route);
    console.log('RoutesService.create saved entity:', JSON.stringify(savedRoute));

    if (items && items.length > 0) {
      // Validate promoter availability for all items first
      if (savedRoute.promoterId) {
        for (const item of items) {
          await this.checkPromoterAvailability(
            savedRoute.promoterId,
            savedRoute.date,
            item.startTime,
            item.estimatedDuration
          );
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const routeItem = this.routeItemsRepository.create({
          supermarket: { id: item.supermarketId },
          supermarketId: item.supermarketId,
          route: { id: savedRoute.id },
          routeId: savedRoute.id,
          order: item.order || i + 1,
          startTime: item.startTime,
          endTime: item.endTime,
          estimatedDuration: item.estimatedDuration
        });
        const savedItem = await this.routeItemsRepository.save(routeItem);

        if (item.productIds && item.productIds.length > 0) {
          const productEntities = item.productIds.map(productId => 
            this.routeItemProductsRepository.create({
              routeItem: { id: savedItem.id },
              routeItemId: savedItem.id,
              product: { id: productId },
              productId: productId
            })
          );
          await this.routeItemProductsRepository.save(productEntities);
        }
      }
    }

    return this.findOne(savedRoute.id);
  }

  findAll() {
    const routes = this.routesRepository.find({
      relations: ['items', 'items.supermarket', 'promoter', 'promoter.supervisor', 'items.products', 'items.products.product', 'items.products.product.brand'],
      order: { date: 'DESC' }
    });
    // Log the first route's promoter for debugging (if any)
    routes.then(rs => {
      if (rs.length > 0) {
        console.log('RoutesService.findAll debug: First route promoter:', JSON.stringify(rs[0].promoter));
        console.log('RoutesService.findAll debug: First route promoterId:', rs[0].promoterId);
      }
    });
    return routes;
  }

  findByPromoter(promoterId: string) {
    return this.routesRepository.find({
      where: { promoter: { id: promoterId } },
      relations: ['items', 'items.supermarket', 'promoter', 'items.products', 'items.products.product'],
      order: { date: 'DESC' }
    });
  }

  findTemplates() {
    return this.routesRepository.find({
      where: { isTemplate: true },
      relations: ['items', 'items.supermarket', 'promoter', 'items.products', 'items.products.product']
    });
  }

  async duplicate(id: string, newDate: string, newPromoterId?: string) {
    const originalRoute = await this.findOne(id);
    if (!originalRoute) {
      throw new Error('Route not found');
    }

    const { id: _, items, ...routeData } = originalRoute;
    
    // Create new route object
    const newRouteData: CreateRouteDto = {
      ...routeData,
      date: newDate,
      promoterId: newPromoterId || originalRoute.promoterId,
      status: 'DRAFT', // Reset status for new route
      isTemplate: false, // Duplicated route is usually an actual route
      templateName: null,
      items: items.map(item => ({
        supermarketId: item.supermarketId,
        order: item.order,
        startTime: item.startTime,
        endTime: item.endTime,
        estimatedDuration: item.estimatedDuration,
        productIds: item.products.map(p => p.productId)
      }))
    };

    return this.create(newRouteData);
  }

  findOne(id: string) {
    return this.routesRepository.findOne({
      where: { id },
      relations: ['items', 'items.supermarket', 'promoter', 'items.products', 'items.products.product']
    });
  }

  async update(id: string, updateRouteDto: UpdateRouteDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log(`Updating route ${id}`, JSON.stringify(updateRouteDto));

      // 1. Fetch route with relations using queryRunner
      const route = await queryRunner.manager.findOne(Route, {
        where: { id },
        relations: ['items', 'items.products']
      });

      if (!route) {
          throw new BadRequestException('Route not found');
      }

      // Check if route can be edited
      if (route.status === 'COMPLETED') {
          throw new BadRequestException('Cannot edit a completed route');
      }

      const hasStarted = route.items?.some(item => 
          item.checkInTime || 
          (item.status !== 'PENDING' && item.status !== 'SKIPPED')
      );

      if (hasStarted) {
          throw new BadRequestException('Cannot edit a route that has already started execution');
      }

      const { items, promoterId, ...routeData } = updateRouteDto;

      // 2. Update basic fields using save() to ensure relations are handled correctly
      Object.assign(route, routeData);
      
      // Handle promoter update explicitly
      if (promoterId !== undefined) {
         route.promoterId = promoterId;
         route.promoter = (promoterId === null || promoterId === '') ? null : { id: promoterId } as any;
      }

      await queryRunner.manager.save(Route, route);

      // 3. Update items if provided
      if (items) {
          // Validate schedule availability for new items
          if (promoterId || route.promoterId) { // use new promoterId or existing one
             const targetPromoterId = promoterId !== undefined ? promoterId : route.promoter?.id || route.promoterId;
             const targetDate = routeData.date || route.date;
             
             if (targetPromoterId && targetDate) {
                 for (const item of items) {
                     await this.checkPromoterAvailability(
                         targetPromoterId,
                         targetDate,
                         item.startTime,
                         item.estimatedDuration,
                         id // exclude current route
                     );
                 }
             }
          }

          // Robust deletion: Find and remove items to handle cascades/constraints safely
          const existingItems = await queryRunner.manager.find(RouteItem, { 
              where: { route: { id } },
              relations: ['products'] 
          });
          
          if (existingItems.length > 0) {
              await queryRunner.manager.remove(existingItems);
          }
          
          // Clear items in the local route object to avoid confusion and ensure clean relation
          route.items = [];

          for (const item of items) {
              const routeItem = queryRunner.manager.create(RouteItem, {
                route: { id: id } as Route,
                routeId: id, // Explicitly set foreign key
                supermarket: { id: item.supermarketId },
                supermarketId: item.supermarketId, // Explicitly set foreign key
                order: item.order,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  estimatedDuration: item.estimatedDuration,
                  status: 'PENDING'
              });
              
              const savedItem = await queryRunner.manager.save(RouteItem, routeItem);

              if (item.productIds && item.productIds.length > 0) {
                  const itemProducts = item.productIds.map(productId => 
                      queryRunner.manager.create(RouteItemProduct, {
                          routeItem: savedItem,
                          routeItemId: savedItem.id,
                          product: { id: productId },
                          productId: productId,
                          checked: false
                      })
                  );
                  await queryRunner.manager.save(RouteItemProduct, itemProducts);
              }
          }
      }
      
      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating route (Stack):', error.stack);
      console.error('Error updating route (Message):', error.message);
      console.error('Error updating route (Full):', JSON.stringify(error, null, 2));
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Erro ao salvar rota: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const route = await this.findOne(id);
    if (!route) {
      throw new BadRequestException('Route not found');
    }

    // Check if route has started execution
    const hasStarted = route.items?.some(item => 
        item.checkInTime || 
        (item.status !== 'PENDING' && item.status !== 'SKIPPED')
    );

    if (hasStarted || route.status === 'COMPLETED' || route.status === 'IN_PROGRESS') {
        throw new BadRequestException('Cannot delete a route that has already started execution or is completed');
    }

    return this.routesRepository.delete(id);
  }

  // Rules
  async createRule(rule: Partial<RouteRule>) {
    return this.routeRulesRepository.save(this.routeRulesRepository.create(rule));
  }

  async findAllRules() {
    return this.routeRulesRepository.find();
  }

  async checkProduct(routeItemId: string, productId: string, data: { checked?: boolean, observation?: string, isStockout?: boolean, stockoutType?: string, photos?: string[] }) {
    const itemProduct = await this.routeItemProductsRepository.findOne({
      where: { routeItemId, productId }
    });

    if (itemProduct) {
      if (data.checked !== undefined) itemProduct.checked = data.checked;
      if (data.observation !== undefined) itemProduct.observation = data.observation;
      if (data.isStockout !== undefined) itemProduct.isStockout = data.isStockout;
      if (data.stockoutType !== undefined) itemProduct.stockoutType = data.stockoutType;
      if (data.photos !== undefined) itemProduct.photos = data.photos;

      return this.routeItemProductsRepository.save(itemProduct);
    }
    
    // If it doesn't exist, maybe we should create it? 
    // For now, let's assume it must exist (linked during route creation)
    // Or we could dynamically link it if the promoter decides to check a product not originally planned.
    // Let's stick to updating existing ones for now as per "vincular os produtos que serao conferidos".
    throw new Error('Product not linked to this route item');
  }

  async manualExecution(itemId: string, data: { 
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
  }, user?: any) {
    const item = await this.routeItemsRepository.findOne({ 
      where: { id: itemId },
      relations: ['route']
    });

    if (!item) throw new BadRequestException('Route Item not found');

    // Update Item Times and Status
    item.checkInTime = new Date(data.checkInTime);
    item.checkOutTime = new Date(data.checkOutTime);
    item.status = 'COMPLETED';
    
    // Audit
    if (user) {
      item.manualEntryBy = user.email || user.username || user.id || 'Admin';
      item.manualEntryAt = new Date();
    }
    
    await this.routeItemsRepository.save(item);

    // Update Route Promoter if provided
    if (data.promoterId && item.route && item.route.promoterId !== data.promoterId) {
       await this.routesRepository.update(item.route.id, { promoter: { id: data.promoterId }, promoterId: data.promoterId });
    }

    // Update Products
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        let productRel = await this.routeItemProductsRepository.findOne({
          where: { routeItemId: itemId, productId: p.productId }
        });

        if (!productRel) {
          productRel = this.routeItemProductsRepository.create({
            routeItemId: itemId,
            productId: p.productId,
            routeItem: item,
            product: { id: p.productId }
          });
        }

        productRel.checked = p.checked;
        productRel.isStockout = p.isStockout;
        productRel.observation = p.observation;
        productRel.photos = p.photos;
        
        await this.routeItemProductsRepository.save(productRel);
      }
    }

    return this.findOne(item.routeId);
  }

  async updateRouteItemStatus(id: string, status: string, time?: Date) {
    const updateData: any = { status };
    if (status === 'CHECKIN' || status === 'IN_PROGRESS') {
      updateData.checkInTime = time || new Date();
    } else if (status === 'CHECKOUT' || status === 'COMPLETED') {
      updateData.checkOutTime = time || new Date();
    }
    return this.routeItemsRepository.update(id, updateData);
  }

  private async checkPromoterAvailability(promoterId: string, date: string, startTime: string, estimatedDuration: number, excludeRouteId?: string) {
    if (!promoterId || !date || !startTime || !estimatedDuration) return;

    // Convert time to minutes
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = startMinutes + estimatedDuration;

    // Find other routes for this promoter on this date
    const routes = await this.routesRepository.find({
      where: { 
        promoter: { id: promoterId },
        date: date
      },
      relations: ['items', 'items.supermarket']
    });

    for (const route of routes) {
      if (excludeRouteId && route.id === excludeRouteId) continue;

      for (const item of route.items) {
        if (!item.startTime || !item.estimatedDuration) continue;

        const itemStart = this.timeToMinutes(item.startTime);
        const itemEnd = itemStart + item.estimatedDuration;

        // Check overlap: (StartA < EndB) && (EndA > StartB)
        if (startMinutes < itemEnd && endMinutes > itemStart) {
           throw new BadRequestException(`O promotor já possui um agendamento conflitante neste horário (PDV: ${item.supermarket?.fantasyName || 'Desconhecido'}, ${item.startTime} - ${this.minutesToTime(itemEnd)}).`);
        }
      }
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
