import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeCompensation } from './entities/employee-compensation.entity';
import { EmployeeDocument } from './entities/employee-document.entity';
import { WorkSchedule } from '../work-schedules/entities/work-schedule.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    @InjectRepository(EmployeeCompensation)
    private compensationRepository: Repository<EmployeeCompensation>,
    @InjectRepository(EmployeeDocument)
    private documentsRepository: Repository<EmployeeDocument>,
    @InjectRepository(WorkSchedule)
    private workScheduleRepository: Repository<WorkSchedule>,
    private usersService: UsersService,
    private rolesService: RolesService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const { baseSalary, transportVoucher, mealVoucher, createAccess, appPassword, weeklyHours, roleId, supervisorId, ...employeeData } = createEmployeeDto;
    
    // Check if email already exists in employees
    const existingEmployee = await this.employeesRepository.findOne({ where: { email: employeeData.email } });
    if (existingEmployee) {
        throw new BadRequestException('Email já cadastrado para outro funcionário.');
    }

    const employee = this.employeesRepository.create({
      ...employeeData,
      role: roleId ? { id: roleId } : null,
      supervisor: supervisorId ? { id: supervisorId } : null,
    });
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

    if (weeklyHours) {
      // Close previous schedule
      const previousSchedule = await this.workScheduleRepository.findOne({
        where: { 
          employeeId: savedEmployee.id,
          validTo: IsNull()
        },
        order: { validFrom: 'DESC' }
      });

      if (previousSchedule) {
          const newStart = new Date();
          const prevEnd = new Date(newStart);
          prevEnd.setDate(prevEnd.getDate() - 1);
          
          await this.workScheduleRepository.update(previousSchedule.id, {
            validTo: prevEnd
          });
      }

      const schedule = this.workScheduleRepository.create({
        employee: savedEmployee,
        validFrom: new Date(),
        weeklyHours: weeklyHours,
        timezone: 'America/Sao_Paulo'
      });
      await this.workScheduleRepository.save(schedule);
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

  async findAll() {
    const employees = await this.employeesRepository.find({ relations: ['role', 'supervisor'] });
    
    // Populate appAccessEnabled for all employees
    // This is not the most efficient way (N+1), but works for now. 
    // Optimization: Fetch all users with employeeId once.
    const users = await this.usersService.findAll(); // Assuming findAll exists and returns all users
    const userEmployeeIds = new Set(users.map(u => u.employeeId).filter(id => !!id));

    return employees.map(emp => ({
      ...emp,
      appAccessEnabled: userEmployeeIds.has(emp.id)
    }));
  }

  async findOne(id: string) {
    const employee = await this.employeesRepository.findOne({ 
      where: { id }, 
      relations: ['role', 'supervisor', 'compensations', 'workSchedules', 'workSchedules.days', 'subordinates'] 
    });

    if (employee) {
      const user = await this.usersService.findByEmployeeId(employee.id);
      (employee as any).appAccessEnabled = !!user;
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const { baseSalary, transportVoucher, mealVoucher, weeklyHours, createAccess, appPassword, roleId, supervisorId, ...employeeData } = updateEmployeeDto;

    // Update basic info if there are fields to update
    const updatePayload: any = { ...employeeData };
    if (roleId !== undefined) updatePayload.role = roleId ? { id: roleId } : null;
    if (supervisorId !== undefined) updatePayload.supervisor = supervisorId ? { id: supervisorId } : null;

    if (Object.keys(updatePayload).length > 0) {
      await this.employeesRepository.save({ id, ...updatePayload });
    }

    const employee = await this.findOne(id);
    if (!employee) return null;

    // Handle Compensation
    if (baseSalary !== undefined || transportVoucher !== undefined || mealVoucher !== undefined) {
      const compensations = employee.compensations || [];
      const currentComp = compensations.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime())[0];

      const newSalary = baseSalary !== undefined ? baseSalary : currentComp?.baseSalary;
      const newTransport = transportVoucher !== undefined ? transportVoucher : currentComp?.transportVoucher;
      const newMeal = mealVoucher !== undefined ? mealVoucher : currentComp?.mealVoucher;

      // Check if anything changed
      const isDifferent = !currentComp || 
        Number(currentComp.baseSalary) !== Number(newSalary) || 
        Number(currentComp.transportVoucher) !== Number(newTransport) || 
        Number(currentComp.mealVoucher) !== Number(newMeal);

      if (isDifferent && newSalary !== undefined) { // Ensure we have at least a salary
        const compensation = this.compensationRepository.create({
          employee: employee,
          validFrom: new Date(),
          remunerationType: 'mensal',
          baseSalary: newSalary,
          transportVoucher: newTransport || 0,
          mealVoucher: newMeal || 0
        });
        await this.compensationRepository.save(compensation);
      }
    }

    // Handle Schedule
    if (weeklyHours !== undefined) {
      const schedules = employee.workSchedules || [];
      const currentSchedule = schedules.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime())[0];
      
      const isDifferent = !currentSchedule || Number(currentSchedule.weeklyHours) !== Number(weeklyHours);

      if (isDifferent) {
        // Close previous schedule
        if (currentSchedule && !currentSchedule.validTo) {
             const newStart = new Date();
             const prevEnd = new Date(newStart);
             prevEnd.setDate(prevEnd.getDate() - 1);
             
             await this.workScheduleRepository.update(currentSchedule.id, {
               validTo: prevEnd
             });
        }

        const schedule = this.workScheduleRepository.create({
          employee: employee,
          validFrom: new Date(),
          weeklyHours: weeklyHours,
          timezone: 'America/Sao_Paulo'
        });
        await this.workScheduleRepository.save(schedule);
      }
    }

    // Handle App Access (User creation/update)
    // Only proceed if createAccess is present in the update payload
    if (createAccess !== undefined) {
      // createAccess might be 'true' string or boolean
      const shouldHaveAccess = String(createAccess) === 'true' || createAccess === 'on';
      const hasUser = (employee as any).appAccessEnabled;

      if (shouldHaveAccess && !hasUser) {
          // Create User
          try {
              const allRoles = await this.rolesService.findAll();
              const promoterRole = allRoles.find(r => 
                  r.name.toLowerCase() === 'promotor' || 
                  r.name.toLowerCase() === 'promoter' || 
                  r.name.toLowerCase() === 'app_user'
              );

              if (promoterRole) {
                  await this.usersService.create({
                      email: employee.email,
                      password: appPassword || 'mudar123',
                      roleId: promoterRole.id,
                      employeeId: employee.id,
                      status: 'active'
                  });
              }
          } catch (e) {
              console.error('Error creating user on update:', e);
          }
      } else if (!shouldHaveAccess && hasUser) {
          // Remove User
          const user = await this.usersService.findByEmployeeId(id);
          if (user) {
              await this.usersService.remove(user.id);
          }
      } else if (shouldHaveAccess && hasUser && appPassword) {
          // Update Password
          const user = await this.usersService.findByEmployeeId(id);
          if (user) {
              await this.usersService.update(user.id, { password: appPassword });
          }
      }
    }

    return this.findOne(id);
  }

  remove(id: string) {
    return this.employeesRepository.delete(id);
  }

  // Methods for compensation and documents could be added here or in separate services
  async addCompensation(data: any) {
    const compensation = this.compensationRepository.create(data);
    return this.compensationRepository.save(compensation);
  }

  async findAllDocuments() {
    return this.documentsRepository.find({
      relations: ['employee'],
      order: { sentAt: 'DESC' }
    });
  }

  async addDocument(data: any) {
    const document = this.documentsRepository.create({
      ...data,
      sentAt: new Date()
    });
    const savedDoc = await this.documentsRepository.save(document);

    // Notify User if they have app access
    try {
      const user = await this.usersService.findByEmployeeId(data.employeeId);
      if (user) {
        await this.notificationsService.create({
          userId: user.id,
          title: 'Novo Documento Recebido',
          message: `Você recebeu um novo documento: ${data.type} - ${data.description || ''}`,
          type: 'document',
          relatedId: (savedDoc as any).id
        });
      }
    } catch (e) {
      console.error('Error notifying user about document:', e);
    }

    return savedDoc;
  }

  async markDocumentAsRead(documentId: string) {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
      relations: ['employee']
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    if (document.readAt) {
      return document; // Already read
    }

    document.readAt = new Date();
    await this.documentsRepository.save(document);

    // Notify Sender (Admin/RH) if senderId exists
    if (document.senderId) {
      await this.notificationsService.create({
        userId: document.senderId,
        title: 'Documento Visualizado',
        message: `${document.employee.fullName} visualizou o documento: ${document.type}`,
        type: 'info',
        relatedId: document.id
      });
    }

    return document;
  }
}
