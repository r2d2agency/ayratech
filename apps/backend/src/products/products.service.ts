import { Injectable, ConflictException, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
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
        throw new BadRequestException('Client ID is required');
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
        const detail = error.detail || '';
        if (detail.includes('sku')) {
          throw new ConflictException('Já existe um produto cadastrado com este SKU.');
        } else if (detail.includes('barcode')) {
          throw new ConflictException('Já existe um produto cadastrado com este Código de Barras.');
        } else if (detail.includes('name')) {
          throw new ConflictException('Já existe um produto cadastrado com este Nome.');
        }
        throw new ConflictException('Já existe um produto cadastrado com este SKU, Nome ou Código de Barras.');
      }
      if (error.code === '23503') {
        throw new BadRequestException('Cliente, Marca ou Categoria inválidos ou não encontrados.');
      }
      console.error('Error creating product:', error);
      throw error;
    }
  }

  findAll() {
    return this.productsRepository.find({ relations: ['brand', 'brand.client', 'client', 'categoryRef', 'categoryRef.parent', 'checklistTemplate'] });
  }

  findOne(id: string) {
    return this.productsRepository.findOne({ 
      where: { id },
      relations: ['brand', 'brand.client', 'client', 'categoryRef', 'categoryRef.parent', 'checklistTemplate']
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const product = await this.productsRepository.findOne({ where: { id } });
      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }

      const { brandId, clientId, categoryId, ...rest } = updateProductDto;
      
      this.productsRepository.merge(product, rest);
      
      if (brandId) {
        product.brand = { id: brandId } as any;
      }
      
      if (clientId) {
        product.client = { id: clientId } as any;
      }

      if (categoryId) {
        product.categoryRef = { id: categoryId } as any;
      }
      
      return await this.productsRepository.save(product);
    } catch (error) {
      if (error.code === '23505') {
        const detail = error.detail || '';
        if (detail.includes('sku')) {
          throw new ConflictException('Já existe um produto cadastrado com este SKU.');
        } else if (detail.includes('barcode')) {
          throw new ConflictException('Já existe um produto cadastrado com este Código de Barras.');
        } else if (detail.includes('name')) {
          throw new ConflictException('Já existe um produto cadastrado com este Nome.');
        }
        throw new ConflictException('Já existe um produto cadastrado com este SKU, Nome ou Código de Barras.');
      }
      if (error.code === '23503') {
        throw new BadRequestException('Cliente, Marca ou Categoria inválidos ou não encontrados.');
      }
      console.error('Error updating product:', error);
      throw new InternalServerErrorException('Erro ao atualizar produto: ' + error.message);
    }
  }

  remove(id: string) {
    return this.productsRepository.delete(id);
  }
}
