import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteItem } from './entities/route-item.entity';
import { RouteItemProduct } from './entities/route-item-product.entity';
import { RouteItemProductChecklist } from './entities/route-item-product-checklist.entity';
import { RouteRule } from './entities/route-rule.entity';
import { ChecklistTemplate } from '../checklists/entities/checklist-template.entity';
import { Client } from '../entities/client.entity';
import { Product } from '../entities/product.entity';
import { User } from '../users/entities/user.entity';
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

      // Pre-fetch products and checklists
      const allProductIds = new Set<string>();
      const allChecklistTemplateIds = new Set<string>();

      items.forEach(item => {
        if (item.productIds) item.productIds.forEach(id => allProductIds.add(id));
        if (item.products) {
            item.products.forEach(p => {
                allProductIds.add(p.productId);
                if (p.checklistTemplateId) allChecklistTemplateIds.add(p.checklistTemplateId);
            });
        }
      });

      const productsMap = new Map<string, Product>();
      if (allProductIds.size > 0) {
        const products = await this.dataSource.getRepository(Product).find({
            where: { id: In(Array.from(allProductIds)) },
            relations: ['checklistTemplate', 'checklistTemplate.items', 'checklistTemplate.items.competitor']
        });
        products.forEach(p => productsMap.set(p.id, p));
      }

      const checklistTemplatesMap = new Map<string, ChecklistTemplate>();
      if (allChecklistTemplateIds.size > 0) {
          const templates = await this.dataSource.getRepository(ChecklistTemplate).find({
              where: { id: In(Array.from(allChecklistTemplateIds)) },
              relations: ['items', 'items.competitor']
          });
          templates.forEach(t => checklistTemplatesMap.set(t.id, t));
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

        const itemProductsToProcess: { productId: string, checklistTemplateId?: string }[] = [];
        if (item.products) itemProductsToProcess.push(...item.products);
        if (item.productIds) {
           item.productIds.forEach(pid => {
               if (!itemProductsToProcess.find(p => p.productId === pid)) {
                   itemProductsToProcess.push({ productId: pid });
               }
           });
        }

        if (itemProductsToProcess.length > 0) {
          for (const prodData of itemProductsToProcess) {
             const rip = this.routeItemProductsRepository.create({
                 routeItem: { id: savedItem.id },
                 routeItemId: savedItem.id,
                 product: { id: prodData.productId },
                 productId: prodData.productId,
                 checklistTemplateId: prodData.checklistTemplateId
             });
             const savedRip = await this.routeItemProductsRepository.save(rip);
             
             let checklistTemplate = null;
             if (prodData.checklistTemplateId) {
                 checklistTemplate = checklistTemplatesMap.get(prodData.checklistTemplateId);
             } else {
                 const product = productsMap.get(prodData.productId);
                 checklistTemplate = product?.checklistTemplate;
             }
             
             if (checklistTemplate?.items?.length) {
                 const checklists = checklistTemplate.items.map(tplItem => 
                    this.dataSource.getRepository(RouteItemProductChecklist).create({
                        routeItemProduct: savedRip,
                        description: tplItem.description,
                        type: tplItem.type,
                        isChecked: false,
                        competitorName: tplItem.competitor?.name || null
                    })
                 );
                 await this.dataSource.getRepository(RouteItemProductChecklist).save(checklists);
             }
          }
        }
      }
    }

    return this.findOne(savedRoute.id);
  }

  async findAll(userId?: string) {
    let allowedClientIds: string[] | null = null;
    
    if (userId) {
        const userRepo = this.dataSource.getRepository(User);
        const user = await userRepo.findOne({ 
            where: { id: userId }, 
            relations: ['clients', 'role'] 
        });

        if (user) {
            const roleName = user.role?.name?.toLowerCase() || '';
            const isAdmin = ['admin', 'administrador do sistema', 'manager', 'rh'].includes(roleName);
            
            if (!isAdmin) {
                if (user.clients && user.clients.length > 0) {
                    allowedClientIds = user.clients.map(c => c.id);
                } else if (roleName.includes('supervisor')) {
                    allowedClientIds = [];
                }
            }
        }
    }

    const qb = this.routesRepository.createQueryBuilder('route')
      .leftJoinAndSelect('route.items', 'items')
      .leftJoinAndSelect('items.supermarket', 'supermarket')
      .leftJoinAndSelect('route.promoter', 'promoter')
      .leftJoinAndSelect('promoter.supervisor', 'supervisor')
      .leftJoinAndSelect('items.products', 'itemProducts')
      .leftJoinAndSelect('itemProducts.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .orderBy('route.date', 'DESC');

    if (allowedClientIds !== null) {
        if (allowedClientIds.length === 0) {
            return [];
        }
        
        qb.leftJoin('product.client', 'productClient')
          .leftJoin('brand.client', 'brandClient')
          .leftJoin('supermarket.clients', 'smClient')
          .andWhere(
              '(productClient.id IN (:...clientIds) OR brandClient.id IN (:...clientIds) OR smClient.id IN (:...clientIds))',
              { clientIds: allowedClientIds }
          );
    }

    return qb.getMany();
  }

  findByPromoter(promoterId: string) {
    return this.routesRepository.find({
      where: { promoter: { id: promoterId } },
      relations: ['items', 'items.supermarket', 'items.products', 'items.products.product'],
      order: { date: 'DESC' }
    });
  }

  async findByClient(clientId: string) {
    console.log('RoutesService.findByClient called with:', clientId);
    try {
      const routes = await this.routesRepository.createQueryBuilder('route')
        .innerJoinAndSelect('route.items', 'items')
        .innerJoinAndSelect('items.supermarket', 'supermarket')
        .leftJoinAndSelect('route.promoter', 'promoter')
        .leftJoinAndSelect('items.products', 'itemProducts')
        .leftJoinAndSelect('itemProducts.product', 'product')
        .leftJoinAndSelect('product.client', 'productClient')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('brand.client', 'brandClient')
        .leftJoin('supermarket.clients', 'smClient')
        .where('productClient.id = :clientId', { clientId })
        .orWhere('brandClient.id = :clientId', { clientId })
        .orWhere('smClient.id = :clientId', { clientId })
        .orderBy('route.date', 'DESC')
        .getMany();
        
      console.log(`RoutesService.findByClient found ${routes.length} routes`);
      return routes;
    } catch (error) {
      console.error('Error in findByClient:', error);
      throw new InternalServerErrorException('Error fetching client routes');
    }
  }

  async findClientSupermarkets(clientId: string) {
    console.log('RoutesService.findClientSupermarkets called with:', clientId);
    if (!clientId) {
      console.error('RoutesService.findClientSupermarkets: No clientId provided');
      return [];
    }

    try {
      const client = await this.dataSource.getRepository(Client).findOne({
        where: { id: clientId },
        relations: ['supermarkets']
      });
      
      if (!client) {
        console.warn(`RoutesService.findClientSupermarkets: Client not found for id ${clientId}`);
        return [];
      }

      console.log(`RoutesService.findClientSupermarkets found ${client.supermarkets?.length || 0} supermarkets`);
      return client.supermarkets || [];
    } catch (error) {
      console.error('Error in findClientSupermarkets:', error);
      // Do not throw 500, return empty array to prevent frontend crash
      // or rethrow as InternalServerErrorException if you want to signal failure
      // For now, let's return empty array but log the error
      return [];
    }
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
      relations: ['items', 'items.supermarket', 'promoter', 'items.products', 'items.products.product', 'items.products.checklists']
    });
  }

  async update(id: string, updateRouteDto: UpdateRouteDto, user?: any) {
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
      const userRole = user?.role?.toLowerCase() || '';
      const isAdmin = ['admin', 'manager', 'superadmin', 'administrador do sistema', 'supervisor de operações'].includes(userRole);

      if (!isAdmin) {
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

          // Pre-fetch products and checklists
          const allProductIds = new Set<string>();
          const allChecklistTemplateIds = new Set<string>();

          items.forEach(item => {
            if (item.productIds) item.productIds.forEach(id => allProductIds.add(id));
            if (item.products) {
                item.products.forEach(p => {
                    allProductIds.add(p.productId);
                    if (p.checklistTemplateId) allChecklistTemplateIds.add(p.checklistTemplateId);
                });
            }
          });

          const productsMap = new Map<string, Product>();
          if (allProductIds.size > 0) {
            const products = await queryRunner.manager.find(Product, {
                where: { id: In(Array.from(allProductIds)) },
                relations: ['checklistTemplate', 'checklistTemplate.items', 'checklistTemplate.items.competitor']
            });
            products.forEach(p => productsMap.set(p.id, p));
          }

          const checklistTemplatesMap = new Map<string, ChecklistTemplate>();
          if (allChecklistTemplateIds.size > 0) {
              const templates = await queryRunner.manager.find(ChecklistTemplate, {
                  where: { id: In(Array.from(allChecklistTemplateIds)) },
                  relations: ['items', 'items.competitor']
              });
              templates.forEach(t => checklistTemplatesMap.set(t.id, t));
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

              const itemProductsToProcess: { productId: string, checklistTemplateId?: string }[] = [];
              if (item.products) itemProductsToProcess.push(...item.products);
              if (item.productIds) {
                 item.productIds.forEach(pid => {
                     if (!itemProductsToProcess.find(p => p.productId === pid)) {
                         itemProductsToProcess.push({ productId: pid });
                     }
                 });
              }

              if (itemProductsToProcess.length > 0) {
                  for (const prodData of itemProductsToProcess) {
                     const rip = queryRunner.manager.create(RouteItemProduct, {
                         routeItem: savedItem,
                         routeItemId: savedItem.id,
                         product: { id: prodData.productId },
                         productId: prodData.productId,
                         checked: false,
                         checklistTemplateId: prodData.checklistTemplateId
                     });
                     const savedRip = await queryRunner.manager.save(RouteItemProduct, rip);
                     
                     let checklistTemplate = null;
                     if (prodData.checklistTemplateId) {
                         checklistTemplate = checklistTemplatesMap.get(prodData.checklistTemplateId);
                     } else {
                         const product = productsMap.get(prodData.productId);
                         checklistTemplate = product?.checklistTemplate;
                     }
                     
                     if (checklistTemplate?.items?.length) {
                         const checklists = checklistTemplate.items.map(tplItem => 
                            queryRunner.manager.create(RouteItemProductChecklist, {
                                routeItemProduct: savedRip,
                                description: tplItem.description,
                                type: tplItem.type,
                                isChecked: false,
                                competitorName: tplItem.competitor?.name || null
                            })
                         );
                         await queryRunner.manager.save(RouteItemProductChecklist, checklists);
                     }
                  }
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

  async remove(id: string, user?: any) {
    const route = await this.findOne(id);
    if (!route) {
      throw new BadRequestException('Route not found');
    }

    // Check if route has started execution
    const isAdmin = user && ['admin', 'manager', 'superadmin'].includes(user.role);

    if (!isAdmin) {
      const hasStarted = route.items?.some(item => 
          item.checkInTime || 
          (item.status !== 'PENDING' && item.status !== 'SKIPPED')
      );

      if (hasStarted || route.status === 'COMPLETED' || route.status === 'IN_PROGRESS') {
          throw new BadRequestException('Cannot delete a route that has already started execution or is completed');
      }
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

  async checkProduct(routeItemId: string, productId: string, data: { checked?: boolean, observation?: string, isStockout?: boolean, stockoutType?: string, photos?: string[], checkInTime?: string, checkOutTime?: string, validityDate?: string, checklists?: { id: string, isChecked: boolean, value?: string }[] }) {
    const itemProduct = await this.routeItemProductsRepository.findOne({
      where: { routeItemId, productId }
    });

    if (itemProduct) {
      if (data.checked !== undefined) itemProduct.checked = data.checked;
      if (data.observation !== undefined) itemProduct.observation = data.observation;
      if (data.isStockout !== undefined) itemProduct.isStockout = data.isStockout;
      if (data.stockoutType !== undefined) itemProduct.stockoutType = data.stockoutType;
      if (data.photos !== undefined) itemProduct.photos = data.photos;
      if (data.checkInTime !== undefined) itemProduct.checkInTime = new Date(data.checkInTime);
      if (data.checkOutTime !== undefined) itemProduct.checkOutTime = new Date(data.checkOutTime);
      if (data.validityDate !== undefined) itemProduct.validityDate = data.validityDate;

      const saved = await this.routeItemProductsRepository.save(itemProduct);

      if (data.checklists && data.checklists.length > 0) {
        const checklistRepo = this.dataSource.getRepository(RouteItemProductChecklist);
        for (const c of data.checklists) {
          await checklistRepo.update(c.id, {
            isChecked: c.isChecked,
            value: c.value
          });
        }
      }

      return saved;
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
    observation?: string;
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
    item.manualEntryBy = user?.email || 'admin';
    item.manualEntryAt = new Date();
    if (data.observation) item.observation = data.observation;

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

    // Validate Photos for Manual Entry Completion
    const updatedItem = await this.routeItemsRepository.findOne({
      where: { id: itemId },
      relations: ['products']
    });

    if (updatedItem) {
        const missingPhotos = updatedItem.products.some(p => !p.photos || p.photos.length === 0);
        if (missingPhotos) {
            // Revert status to PENDING if photos are missing, or throw error?
            // User said: "se finalizar sem fotos ele fica pendente"
            // Since we already saved status=COMPLETED above (line 413), we should probably revert it or throw error.
            // But Manual Entry is an admin action, maybe we should just warn?
            // The user instruction seems general. Let's enforce it.
            // Reverting status to PENDING if validation fails
            updatedItem.status = 'PENDING';
            await this.routeItemsRepository.save(updatedItem);
            throw new BadRequestException('A visita ficou como PENDENTE pois todos os produtos precisam ter fotos.');
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

  async checkIn(itemId: string, data: { lat: number; lng: number; timestamp: string }) {
    const item = await this.routeItemsRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    
    item.status = 'CHECKIN';
    item.checkInTime = new Date(data.timestamp);
    // optionally save location data if we add columns for it
    
    return this.routeItemsRepository.save(item);
  }

  async checkOut(itemId: string, data: { lat: number; lng: number; timestamp: string }) {
    const item = await this.routeItemsRepository.findOne({ 
      where: { id: itemId },
      relations: ['products', 'route']
    });
    if (!item) throw new NotFoundException('Item not found');

    // Late Sync Validation
    if (item.route && item.route.date) {
        const now = new Date();
        const dateVal: any = item.route.date;
        const dateStr = dateVal instanceof Date ? dateVal.toISOString().split('T')[0] : dateVal;
        const cutoff20h = new Date(`${dateStr}T20:00:00`);
        const deadline24h = new Date(cutoff20h);
        deadline24h.setHours(deadline24h.getHours() + 24);

        if (now > deadline24h) {
             // Revert to PENDING logic requested by user
             // "apartir de agora tem que ser feito lançamento manual"
             // Throwing error to force manual entry
             throw new BadRequestException('Prazo de sincronismo expirado (> 24h após 20:00). Realize o lançamento manual no painel web.');
        }

        if (now > cutoff20h) {
            // "sincronismo fora de horario" -> Add warning
            item.observation = (item.observation || '') + ' [Alerta: Sincronismo fora de horário]';
        }
    }

    // Validate if all products have photos
    // User requirement: "todos os produtos do checklist precisa ter fotos se finalizar sem fotos ele fica pendente"
    const pendingProducts = item.products.filter(p => !p.photos || p.photos.length === 0);
    if (pendingProducts.length > 0) {
      throw new BadRequestException('Todos os produtos do checklist precisam ter fotos para finalizar.');
    }
    
    item.status = 'CHECKOUT';
    item.checkOutTime = new Date(data.timestamp);
    
    return this.routeItemsRepository.save(item);
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
