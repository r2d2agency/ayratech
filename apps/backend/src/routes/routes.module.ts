import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { PublicRoutesController } from './public-routes.controller';
import { Route } from './entities/route.entity';
import { RouteItem } from './entities/route-item.entity';
import { RouteItemProduct } from './entities/route-item-product.entity';
import { RouteRule } from './entities/route-rule.entity';
import { RouteItemProductChecklist } from './entities/route-item-product-checklist.entity';
import { RouteItemCheckin } from './entities/route-item-checkin.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteItem, RouteItemProduct, RouteRule, RouteItemProductChecklist, RouteItemCheckin]),
    NotificationsModule,
    ConfigModule
  ],
  controllers: [RoutesController, PublicRoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
