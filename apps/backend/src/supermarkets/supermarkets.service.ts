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

  async create(createSupermarketDto: CreateSupermarketDto) {
    const { clientIds, groupId, ...supermarketData } = createSupermarketDto;
    const supermarket = this.supermarketsRepository.create({
      ...supermarketData,
      group: groupId ? { id: groupId } : null,
      clients: clientIds ? clientIds.map(id => ({ id })) : []
    });
    return this.supermarketsRepository.save(supermarket);
  }

  findAll() {
    return this.supermarketsRepository.find({
      relations: ['group', 'clients']
    });
  }

  findOne(id: string) {
    return this.supermarketsRepository.findOne({ 
      where: { id },
      relations: ['group', 'clients']
    });
  }

  async update(id: string, updateSupermarketDto: UpdateSupermarketDto) {
    const { clientIds, groupId, ...rest } = updateSupermarketDto;
    
    // Handle groupId update
    if (groupId) {
        await this.supermarketsRepository.save({
            id,
            ...rest,
            group: { id: groupId }
        });
    } else if (Object.keys(rest).length > 0) {
        // First update basic fields
        await this.supermarketsRepository.update(id, rest);
    }
    
    // If clientIds provided, we need to update the relationship
    if (clientIds) {
      const supermarket = await this.supermarketsRepository.findOne({ 
        where: { id },
        relations: ['clients'] 
      });
      
      if (supermarket) {
        supermarket.clients = clientIds.map(cid => ({ id: cid } as any));
        await this.supermarketsRepository.save(supermarket);
      }
    }
    
    return this.findOne(id);
  }

  remove(id: string) {
    return this.supermarketsRepository.delete(id);
  }
}
