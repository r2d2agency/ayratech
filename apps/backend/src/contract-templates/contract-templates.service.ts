import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractTemplate } from '../entities/contract-template.entity';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';

@Injectable()
export class ContractTemplatesService {
  constructor(
    @InjectRepository(ContractTemplate)
    private contractTemplatesRepository: Repository<ContractTemplate>,
  ) {}

  create(createContractTemplateDto: CreateContractTemplateDto) {
    const template = this.contractTemplatesRepository.create(createContractTemplateDto);
    return this.contractTemplatesRepository.save(template);
  }

  findAll() {
    return this.contractTemplatesRepository.find();
  }

  findOne(id: string) {
    return this.contractTemplatesRepository.findOneBy({ id });
  }

  update(id: string, updateContractTemplateDto: UpdateContractTemplateDto) {
    return this.contractTemplatesRepository.update(id, updateContractTemplateDto);
  }

  remove(id: string) {
    return this.contractTemplatesRepository.delete(id);
  }
}
