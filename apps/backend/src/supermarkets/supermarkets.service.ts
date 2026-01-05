import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supermarket } from '../entities/supermarket.entity';
import { CreateSupermarketDto } from './dto/create-supermarket.dto';
import { UpdateSupermarketDto } from './dto/update-supermarket.dto';

@Injectable()
export class SupermarketsService {
  constructor(
    @InjectRepository(Supermarket)
    private supermarketsRepository: Repository<Supermarket>,
  ) {}

  create(createSupermarketDto: CreateSupermarketDto) {
    const supermarket = this.supermarketsRepository.create(createSupermarketDto);
    return this.supermarketsRepository.save(supermarket);
  }

  findAll() {
    return this.supermarketsRepository.find();
  }

  findOne(id: string) {
    return this.supermarketsRepository.findOneBy({ id });
  }

  update(id: string, updateSupermarketDto: UpdateSupermarketDto) {
    return this.supermarketsRepository.update(id, updateSupermarketDto);
  }

  remove(id: string) {
    return this.supermarketsRepository.delete(id);
  }
}
