import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  referenceImageUrl?: string;

  @IsOptional()
  @IsString()
  analysisPrompt?: string;

  @IsOptional()
  @IsString()
  checklistTemplateId?: string;

  @IsOptional()
  supermarketGroupIds?: string[];
}
