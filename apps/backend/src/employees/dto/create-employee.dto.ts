export class CreateEmployeeDto {
  fullName: string;
  cpf: string;
  rg?: string;
  birthDate?: Date;
  email: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  internalCode: string;
  roleId?: string;
  supervisorId?: string;
  region?: string;
  contractType: string;
  admissionDate: Date;
  status: string;

  // Optional initial compensation
  baseSalary?: number;
  transportVoucher?: number;
  mealVoucher?: number;
}
