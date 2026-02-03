import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { Route } from './entities/route.entity';
import { RouteItem } from './entities/route-item.entity';
import { RouteItemProduct } from './entities/route-item-product.entity';
import { RouteRule } from './entities/route-rule.entity';
import { RouteItemProductChecklist } from './entities/route-item-product-checklist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Route, RouteItem, RouteItemProduct, RouteRule, RouteItemProductChecklist])],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
