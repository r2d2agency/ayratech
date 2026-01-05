import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
  ) {}

  create(createBrandDto: CreateBrandDto) {
    const brand = this.brandsRepository.create(createBrandDto);
    return this.brandsRepository.save(brand);
  }

  findAll() {
    return this.brandsRepository.find({ relations: ['client', 'products'] });
  }

  findOne(id: string) {
    return this.brandsRepository.findOne({ 
      where: { id },
      relations: ['client', 'products']
    });
  }

  update(id: string, updateBrandDto: UpdateBrandDto) {
    return this.brandsRepository.update(id, updateBrandDto);
  }

  remove(id: string) {
    return this.brandsRepository.delete(id);
  }
}
