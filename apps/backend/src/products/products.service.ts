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
    const { brandId, clientId, categoryId, ...productData } = createProductDto;
    const product = this.productsRepository.create({
      ...productData,
      brand: brandId ? { id: brandId } : null,
      client: clientId ? { id: clientId } : null,
      categoryRef: categoryId ? { id: categoryId } : null
    });
    return this.productsRepository.save(product);
  }

  findAll() {
    return this.productsRepository.find({ relations: ['brand', 'brand.client', 'client', 'categoryRef'] });
  }

  findOne(id: string) {
    return this.productsRepository.findOne({ 
      where: { id },
      relations: ['brand', 'brand.client', 'client', 'categoryRef']
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { brandId, clientId, categoryId, ...rest } = updateProductDto;
    const updateData: any = { ...rest };
    
    if (brandId) {
      updateData.brand = { id: brandId };
    }
    
    if (clientId) {
      updateData.client = { id: clientId };
    }

    if (categoryId) {
      updateData.categoryRef = { id: categoryId };
    }
    
    // Check if we need to remove the relation if passed as null/empty string?
    // For now assuming we just update if provided.
    
    await this.productsRepository.update(id, updateData);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }
}
