import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supermarket } from '../entities/supermarket.entity';
import { CreateSupermarketDto } from './dto/create-supermarket.dto';
import { UpdateSupermarketDto } from './dto/update-supermarket.dto';
import { SupermarketGroup } from '../supermarket-groups/entities/supermarket-group.entity';

@Injectable()
export class SupermarketsService {
  constructor(
    @InjectRepository(Supermarket)
    private supermarketsRepository: Repository<Supermarket>,
    @InjectRepository(SupermarketGroup) // Add this if not already injected
    private groupsRepository: Repository<SupermarketGroup>, // Note: I need to check if SupermarketGroupsModule exports this or if I need to inject it
  ) {}

  async create(createSupermarketDto: CreateSupermarketDto) {
    try {
      const { clientIds, groupId, ...supermarketData } = createSupermarketDto;
      const supermarket = this.supermarketsRepository.create({
        ...supermarketData,
        group: groupId ? { id: groupId } : null,
        clients: clientIds ? clientIds.map(id => ({ id })) : []
      });
      return await this.supermarketsRepository.save(supermarket);
    } catch (error) {
      if (error.code === '23503') {
        throw new BadRequestException('Grupo ou Clientes inválidos ou não encontrados.');
      }
      throw error;
    }
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
    try {
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
    } catch (error) {
      if (error.code === '23503') {
        throw new BadRequestException('Grupo ou Clientes inválidos ou não encontrados.');
      }
      throw error;
    }
  }

  remove(id: string) {
    return this.supermarketsRepository.delete(id);
  }
}
