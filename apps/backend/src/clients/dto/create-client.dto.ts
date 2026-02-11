import { IsString, IsOptional, IsEmail, IsEnum, IsObject } from 'class-validator';

export class CreateClientDto {
  @IsString()
  razaoSocial: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  emailPrincipal?: string;

  @IsOptional()
  @IsString()
  telefonePrincipal?: string;

  @IsOptional()
  @IsString()
  // @IsEnum(['ativo', 'inativo', 'suspenso']) // Optional: enforce enum
  status?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsObject()
  photoConfig?: {
    labels?: {
      before?: string;
      storage?: string;
      after?: string;
    }
  };

  @IsOptional()
  @IsString()
  password?: string;
}
