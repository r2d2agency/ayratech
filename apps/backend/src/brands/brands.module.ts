import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../entities/brand.entity';
import { Client } from '../entities/client.entity';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, Client])],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
