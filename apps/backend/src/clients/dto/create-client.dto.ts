export class CreateClientDto {
  name: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  responsibleName?: string;
  responsibleContact?: string;
  email?: string;
  logo?: string;
  status?: boolean;
}
