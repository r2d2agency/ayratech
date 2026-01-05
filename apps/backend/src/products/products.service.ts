import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  create(createProductDto: CreateProductDto) {
    const product = this.productsRepository.create({
      ...createProductDto,
      client: { id: createProductDto.clientId }
    });
    return this.productsRepository.save(product);
  }

  findAll() {
    return this.productsRepository.find({ relations: ['client'] });
  }

  findOne(id: string) {
    return this.productsRepository.findOne({ 
      where: { id },
      relations: ['client']
    });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    // Handling relations in update is trickier with simple update, but for now standard update
    // If clientId is passed, it needs to be mapped to client relation
    const { clientId, ...rest } = updateProductDto;
    const updateData: any = { ...rest };
    if (clientId) {
      updateData.client = { id: clientId };
    }
    return this.productsRepository.update(id, updateData);
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }
}
