export class CreateProductDto {
  name: string;
  sku: string;
  category: string;
  image?: string;
  clientId: string;
  brandId?: string;
  barcode?: string;
  subcategory?: string;
  status?: string;
}
