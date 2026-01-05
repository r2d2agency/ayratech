import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupermarketGroupsService } from './supermarket-groups.service';
import { SupermarketGroupsController } from './supermarket-groups.controller';
import { SupermarketGroup } from '../entities/supermarket-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupermarketGroup])],
  controllers: [SupermarketGroupsController],
  providers: [SupermarketGroupsService],
  exports: [SupermarketGroupsService],
})
export class SupermarketGroupsModule {}
