import { IsString, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RouteItemDto {
  @IsString()
  supermarketId: string;

  @IsOptional()
  order: number;
}

export class CreateRouteDto {
  @IsDateString()
  date: string;

  @IsString()
  promoterId: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteItemDto)
  items: RouteItemDto[];
}
