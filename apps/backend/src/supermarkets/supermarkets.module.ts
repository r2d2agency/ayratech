import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupermarketsService } from './supermarkets.service';
import { SupermarketsController } from './supermarkets.controller';
import { Supermarket } from '../entities/supermarket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Supermarket])],
  controllers: [SupermarketsController],
  providers: [SupermarketsService],
  exports: [SupermarketsService],
})
export class SupermarketsModule {}
