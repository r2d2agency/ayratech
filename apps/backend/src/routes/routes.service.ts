import { Injectable } from '@nestjs/common';
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
    
    const route = this.routesRepository.create(routeData);
    const savedRoute = await this.routesRepository.save(route);

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const routeItem = this.routeItemsRepository.create({
          supermarketId: item.supermarketId,
          routeId: savedRoute.id,
          order: item.order || i + 1,
          startTime: item.startTime,
          estimatedDuration: item.estimatedDuration
        });
        const savedItem = await this.routeItemsRepository.save(routeItem);

        if (item.productIds && item.productIds.length > 0) {
          const productEntities = item.productIds.map(productId => 
            this.routeItemProductsRepository.create({
              routeItemId: savedItem.id,
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
    return this.routesRepository.find({
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

  update(id: string, updateRouteDto: UpdateRouteDto) {
    return this.routesRepository.update(id, updateRouteDto);
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

  async checkProduct(routeItemId: string, productId: string, checked: boolean, observation?: string) {
    const itemProduct = await this.routeItemProductsRepository.findOne({
      where: { routeItemId, productId }
    });

    if (itemProduct) {
      itemProduct.checked = checked;
      if (observation !== undefined) {
        itemProduct.observation = observation;
      }
      return this.routeItemProductsRepository.save(itemProduct);
    }
    
    // If it doesn't exist, maybe we should create it? 
    // For now, let's assume it must exist (linked during route creation)
    // Or we could dynamically link it if the promoter decides to check a product not originally planned.
    // Let's stick to updating existing ones for now as per "vincular os produtos que serao conferidos".
    throw new Error('Product not linked to this route item');
  }
}
