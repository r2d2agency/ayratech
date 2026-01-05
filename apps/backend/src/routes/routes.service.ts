import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteItem } from './entities/route-item.entity';
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
    @InjectRepository(RouteRule)
    private routeRulesRepository: Repository<RouteRule>,
  ) {}

  async create(createRouteDto: CreateRouteDto) {
    const { items, ...routeData } = createRouteDto;
    
    const route = this.routesRepository.create(routeData);
    const savedRoute = await this.routesRepository.save(route);

    if (items && items.length > 0) {
      const routeItems = items.map((item, index) => 
        this.routeItemsRepository.create({
          ...item,
          routeId: savedRoute.id,
          order: item.order || index + 1
        })
      );
      await this.routeItemsRepository.save(routeItems);
    }

    return this.findOne(savedRoute.id);
  }

  findAll() {
    return this.routesRepository.find({
      relations: ['items', 'items.supermarket', 'promoter'],
      order: { date: 'DESC' }
    });
  }

  findOne(id: string) {
    return this.routesRepository.findOne({
      where: { id },
      relations: ['items', 'items.supermarket', 'promoter']
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
}
