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
    const { brandId, ...productData } = createProductDto;
    const product = this.productsRepository.create({
      ...productData,
      brand: brandId ? { id: brandId } : null
    });
    return this.productsRepository.save(product);
  }

  findAll() {
    return this.productsRepository.find({ relations: ['brand', 'brand.client'] });
  }

  findOne(id: string) {
    return this.productsRepository.findOne({ 
      where: { id },
      relations: ['brand', 'brand.client']
    });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    const { brandId, ...rest } = updateProductDto;
    const updateData: any = { ...rest };
    if (brandId) {
      updateData.brand = { id: brandId };
    }
    return this.productsRepository.update(id, updateData);
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }
}
