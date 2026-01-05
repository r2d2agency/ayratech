import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeCompensation } from './entities/employee-compensation.entity';
import { EmployeeDocument } from './entities/employee-document.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    @InjectRepository(EmployeeCompensation)
    private compensationRepository: Repository<EmployeeCompensation>,
    @InjectRepository(EmployeeDocument)
    private documentsRepository: Repository<EmployeeDocument>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const { baseSalary, transportVoucher, mealVoucher, ...employeeData } = createEmployeeDto;
    
    const employee = this.employeesRepository.create(employeeData);
    const savedEmployee = await this.employeesRepository.save(employee);

    if (baseSalary) {
      const compensation = this.compensationRepository.create({
        employee: savedEmployee,
        validFrom: new Date(), // Today as start of validity
        remunerationType: 'mensal',
        baseSalary: baseSalary,
        transportVoucher: transportVoucher || 0,
        mealVoucher: mealVoucher || 0
      });
      await this.compensationRepository.save(compensation);
    }

    return savedEmployee;
  }

  findAll() {
    return this.employeesRepository.find({ relations: ['role', 'supervisor'] });
  }

  findOne(id: string) {
    return this.employeesRepository.findOne({ where: { id }, relations: ['role', 'supervisor'] });
  }

  update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesRepository.update(id, updateEmployeeDto);
  }

  remove(id: string) {
    return this.employeesRepository.delete(id);
  }

  // Methods for compensation and documents could be added here or in separate services
  async addCompensation(data: any) {
    const compensation = this.compensationRepository.create(data);
    return this.compensationRepository.save(compensation);
  }

  async addDocument(data: any) {
    const document = this.documentsRepository.create(data);
    return this.documentsRepository.save(document);
  }
}
