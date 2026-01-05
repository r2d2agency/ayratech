import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractsRepository: Repository<Contract>,
  ) {}

  create(createContractDto: CreateContractDto) {
    const contract = this.contractsRepository.create(createContractDto);
    return this.contractsRepository.save(contract);
  }

  findAll() {
    return this.contractsRepository.find();
  }

  findOne(id: string) {
    return this.contractsRepository.findOneBy({ id });
  }

  update(id: string, updateContractDto: UpdateContractDto) {
    return this.contractsRepository.update(id, updateContractDto);
  }

  remove(id: string) {
    return this.contractsRepository.delete(id);
  }
}
