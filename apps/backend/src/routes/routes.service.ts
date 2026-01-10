import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async create(createRouteDto: CreateRouteDto) {
    const { items, ...routeData } = createRouteDto;
    
    const route = this.routesRepository.create({
      ...routeData,
      promoter: routeData.promoterId ? { id: routeData.promoterId } : null,
    });
    const savedRoute = await this.routesRepository.save(route);

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const routeItem = this.routeItemsRepository.create({
          supermarket: { id: item.supermarketId },
          route: { id: savedRoute.id },
          order: item.order || i + 1,
          startTime: item.startTime,
          estimatedDuration: item.estimatedDuration
        });
        const savedItem = await this.routeItemsRepository.save(routeItem);

        if (item.productIds && item.productIds.length > 0) {
          const productEntities = item.productIds.map(productId => 
            this.routeItemProductsRepository.create({
              routeItem: { id: savedItem.id },
              product: { id: productId }
            })
          );
          await this.routeItemProductsRepository.save(productEntities);
        }
      }
    }

    return this.findOne(savedRoute.id);
  }

  findAll() {
    return this.routesRepository.find({
      relations: ['items', 'items.supermarket', 'promoter', 'items.products', 'items.products.product'],
      order: { date: 'DESC' }
    });
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
    const route = await this.findOne(id);
    if (!route) {
        throw new BadRequestException('Route not found');
    }

    // Check if route can be edited
    if (route.status === 'COMPLETED') {
        throw new BadRequestException('Cannot edit a completed route');
    }

    // Check if any item has started (execution started)
    const hasStarted = route.items?.some(item => 
        item.checkInTime || 
        (item.status !== 'PENDING' && item.status !== 'SKIPPED')
    );

    if (hasStarted) {
        throw new BadRequestException('Cannot edit a route that has already started execution');
    }

    const { items, promoterId, ...routeData } = updateRouteDto;

    try {
      // Update basic fields
      await this.routesRepository.save({
          id,
          ...routeData,
          promoter: promoterId === null ? null : (promoterId ? { id: promoterId } : undefined),
      });

      // Update items if provided
      if (items) {
          // Robust deletion strategy:
          // 1. Identify existing items
          const existingItems = route.items || [];
          const existingItemIds = existingItems.map(i => i.id);

          if (existingItemIds.length > 0) {
            // 2. Manually delete products first (ignoring DB cascade state to be safe)
            // Note: routeItem is the property name in RouteItemProduct
            await this.routeItemProductsRepository.delete({ routeItem: { id: In(existingItemIds) } });
            
            // 3. Delete items
            await this.routeItemsRepository.delete({ id: In(existingItemIds) });
          }

          // Create new items
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const routeItem = this.routeItemsRepository.create({
                  supermarket: { id: item.supermarketId },
                  route: { id: id },
                  order: item.order || i + 1,
                  startTime: item.startTime,
                  estimatedDuration: item.estimatedDuration
              });
              const savedItem = await this.routeItemsRepository.save(routeItem);

              if (item.productIds && item.productIds.length > 0) {
                  const productEntities = item.productIds.map(productId => 
                      this.routeItemProductsRepository.create({
                          routeItem: { id: savedItem.id },
                          product: { id: productId }
                      })
                  );
                  await this.routeItemProductsRepository.save(productEntities);
              }
          }
      }
      
      return this.findOne(id);
    } catch (error) {
      console.error('Error updating route:', error);
      throw new BadRequestException('Erro ao atualizar rota: ' + error.message);
    }
  }

  remove(id: string) {
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

  async updateRouteItemStatus(id: string, status: string, time?: Date) {
    const updateData: any = { status };
    if (status === 'CHECKIN' || status === 'IN_PROGRESS') {
      updateData.checkInTime = time || new Date();
    } else if (status === 'CHECKOUT' || status === 'COMPLETED') {
      updateData.checkOutTime = time || new Date();
    }
    return this.routeItemsRepository.update(id, updateData);
  }
}
