import { IsString, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RouteItemProductDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  checklistTemplateId?: string;
}

class RouteItemDto {
  @IsString()
  supermarketId: string;

  @IsOptional()
  order: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  estimatedDuration?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteItemProductDto)
  products?: RouteItemProductDto[];
}

export class CreateRouteDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  promoterId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  promoterIds?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteItemDto)
  items: RouteItemDto[];
}
