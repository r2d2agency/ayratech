import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
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

  async create(createProductDto: CreateProductDto) {
    try {
      const { brandId, clientId, categoryId, ...productData } = createProductDto;
      
      // Basic validation
      if (!clientId) {
        throw new InternalServerErrorException('Client ID is required');
      }

      const product = this.productsRepository.create({
        ...productData,
        brand: brandId ? { id: brandId } : null,
        client: clientId ? { id: clientId } : null,
        categoryRef: categoryId ? { id: categoryId } : null
      });
      return await this.productsRepository.save(product);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Já existe um produto cadastrado com este SKU ou nome.');
      }
      console.error('Error creating product:', error);
      throw error;
    }
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
    try {
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
      
      await this.productsRepository.update(id, updateData);
      return this.findOne(id);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Já existe um produto cadastrado com este SKU ou nome.');
      }
      console.error('Error updating product:', error);
      throw error;
    }
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }
}
