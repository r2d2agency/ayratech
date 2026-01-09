import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeCompensation } from './entities/employee-compensation.entity';
import { EmployeeDocument } from './entities/employee-document.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    @InjectRepository(EmployeeCompensation)
    private compensationRepository: Repository<EmployeeCompensation>,
    @InjectRepository(EmployeeDocument)
    private documentsRepository: Repository<EmployeeDocument>,
    private usersService: UsersService,
    private rolesService: RolesService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const { baseSalary, transportVoucher, mealVoucher, createAccess, appPassword, ...employeeData } = createEmployeeDto;
    
    // Check if email already exists in employees
    const existingEmployee = await this.employeesRepository.findOne({ where: { email: employeeData.email } });
    if (existingEmployee) {
        throw new BadRequestException('Email já cadastrado para outro funcionário.');
    }

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

    // Handle User Creation for App Access
    if (createAccess === 'true' || createAccess === '1' || createAccess === 'on') {
        try {
            // Find 'promotor' role
            const allRoles = await this.rolesService.findAll();
            const promoterRole = allRoles.find(r => 
                r.name.toLowerCase() === 'promotor' || 
                r.name.toLowerCase() === 'promoter' || 
                r.name.toLowerCase() === 'app_user'
            );

            if (!promoterRole) {
                console.warn('Role "promotor" not found. Skipping user creation.');
            } else {
                // Check if user exists
                const existingUser = await this.usersService.findOne(savedEmployee.email);
                if (!existingUser) {
                    await this.usersService.create({
                        email: savedEmployee.email,
                        password: appPassword || 'mudar123',
                        roleId: promoterRole.id,
                        employeeId: savedEmployee.id,
                        status: 'active'
                    });
                    console.log(`User created for employee ${savedEmployee.email}`);
                }
            }
        } catch (error) {
            console.error('Error creating user for employee:', error);
            // Don't fail the request, just log it
        }
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
