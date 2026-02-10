import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
      console.error('Error creating supermarket:', error);
      if (error.code === '23503') {
        throw new BadRequestException('Grupo ou Clientes inválidos ou não encontrados.');
      }
      if (error.code === '23502') {
        throw new BadRequestException('Campo obrigatório ausente: ' + (error.column || 'desconhecido'));
      }
      if (error.code === '22P02') {
        throw new BadRequestException('Formato de dados inválido (ex: número ou UUID malformado).');
      }
      if (error.code === '22001') {
        throw new BadRequestException('Texto muito longo para um dos campos.');
      }
      throw new InternalServerErrorException('Erro ao criar supermercado: ' + error.message);
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
      console.error('Error updating supermarket:', error);
      if (error.code === '23503') {
        throw new BadRequestException('Grupo ou Clientes inválidos ou não encontrados.');
      }
      if (error.code === '23502') {
        throw new BadRequestException('Campo obrigatório ausente: ' + (error.column || 'desconhecido'));
      }
      if (error.code === '22P02') {
        throw new BadRequestException('Formato de dados inválido (ex: número ou UUID malformado).');
      }
      if (error.code === '22001') {
        throw new BadRequestException('Texto muito longo para um dos campos.');
      }
      throw new InternalServerErrorException('Erro ao atualizar supermercado: ' + error.message);
    }
  }

  remove(id: string) {
    return this.supermarketsRepository.delete(id);
  }
}
