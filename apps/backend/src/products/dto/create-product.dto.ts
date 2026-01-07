export class CreateProductDto {
  name: string;
  sku: string;
  category?: string;
  categoryId?: string;
  image?: string;
  clientId: string;
  brandId?: string;
  barcode?: string;
  subcategory?: string;
  status?: string;
}
