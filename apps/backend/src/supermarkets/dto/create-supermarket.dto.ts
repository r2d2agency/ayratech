export class CreateSupermarketDto {
  fantasyName: string;
  cnpj?: string;
  groupId: string;
  classification: string;
  
  // Address Fields
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;

  status?: boolean;
}
