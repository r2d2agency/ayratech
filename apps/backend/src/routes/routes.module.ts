import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { Route } from './entities/route.entity';
import { RouteItem } from './entities/route-item.entity';
import { RouteItemProduct } from './entities/route-item-product.entity';
import { RouteRule } from './entities/route-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Route, RouteItem, RouteItemProduct, RouteRule])],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
