export class CreateProductDto {
  name: string;
  sku: string;
  category: string;
  image?: string;
  clientId: string;
}
