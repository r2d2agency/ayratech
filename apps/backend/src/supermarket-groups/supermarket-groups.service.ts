import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupermarketGroup } from './entities/supermarket-group.entity';
import { CreateSupermarketGroupDto } from './dto/create-supermarket-group.dto';
import { UpdateSupermarketGroupDto } from './dto/update-supermarket-group.dto';

@Injectable()
export class SupermarketGroupsService {
  constructor(
    @InjectRepository(SupermarketGroup)
    private supermarketGroupRepository: Repository<SupermarketGroup>,
  ) {}

  create(createSupermarketGroupDto: CreateSupermarketGroupDto) {
    const group = this.supermarketGroupRepository.create(createSupermarketGroupDto);
    return this.supermarketGroupRepository.save(group);
  }

  findAll() {
    return this.supermarketGroupRepository.find();
  }

  findOne(id: string) {
    return this.supermarketGroupRepository.findOneBy({ id });
  }

  async update(id: string, updateSupermarketGroupDto: UpdateSupermarketGroupDto) {
    if (Object.keys(updateSupermarketGroupDto).length > 0) {
      await this.supermarketGroupRepository.update(id, updateSupermarketGroupDto);
    }
    return this.findOne(id);
  }

  remove(id: string) {
    return this.supermarketGroupRepository.delete(id);
  }
}
