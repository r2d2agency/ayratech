import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Client } from '../entities/client.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  create(createBrandDto: CreateBrandDto) {
    const { clientId, ...brandData } = createBrandDto;
    if (!clientId) {
      throw new BadRequestException('clientId é obrigatório');
    }
    return this.clientsRepository.findOne({ where: { id: clientId } }).then(client => {
      if (!client) throw new NotFoundException('Cliente não encontrado');
      const brand = this.brandsRepository.create({
        ...brandData,
        client,
      });
      return this.brandsRepository.save(brand);
    }).catch(err => {
      throw new BadRequestException(err.message || 'Erro ao criar marca');
    });
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

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    const { clientId, ...brandData } = updateBrandDto;
    
    try {
      const brand = await this.brandsRepository.findOne({ where: { id } });
      if (!brand) throw new NotFoundException('Marca não encontrada');

      this.brandsRepository.merge(brand, brandData);

      if (clientId) {
        const client = await this.clientsRepository.findOne({ where: { id: clientId } });
        if (!client) {
          throw new BadRequestException('Cliente não encontrado');
        }
        brand.client = client;
      }
      
      // If no data to update (brandData is empty and clientId is not provided), just return the existing brand
      if (Object.keys(brandData).length === 0 && !clientId) {
        return brand;
      }

      return await this.brandsRepository.save(brand);
    } catch (err) {
      console.error(`Error updating brand ${id}:`, err);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      if (err.code === '23503') {
        throw new BadRequestException('Cliente inválido ou não encontrado');
      }
      // Log detailed error for debugging schema mismatches
      if (err.code === '42703') { // Undefined column
         console.error('Database schema mismatch: Column not found. Ensure migrations have run.');
      }
      throw new BadRequestException(err.message || 'Erro ao atualizar marca');
    }
  }

  remove(id: string) {
    return this.brandsRepository.findOne({ where: { id }, relations: ['products'] }).then(existing => {
      if (!existing) throw new NotFoundException('Marca não encontrada');
      if (existing.products && existing.products.length > 0) {
        throw new BadRequestException('Não é possível excluir uma marca que possui produtos associados. Remova ou reassocie os produtos primeiro.');
      }
      return this.brandsRepository.delete(id);
    }).catch(err => {
      throw new BadRequestException(err.message || 'Erro ao excluir marca');
    });
  }
}
