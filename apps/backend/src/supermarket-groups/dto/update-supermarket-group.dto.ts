import { PartialType } from '@nestjs/mapped-types';
import { CreateSupermarketGroupDto } from './create-supermarket-group.dto';

export class UpdateSupermarketGroupDto extends PartialType(CreateSupermarketGroupDto) {}
