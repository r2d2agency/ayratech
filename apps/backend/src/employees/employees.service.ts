import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
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

  async findByCpf(cpf: string): Promise<Employee | undefined> {
    return this.employeesRepository.findOne({ where: { cpf } });
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    // Find employee linked to this user
    const user = await this.usersService.findById(userId);
    if (!user || !user.employee) {
        return;
    }
    
    await this.employeesRepository.update(user.employee.id, {
        lastLatitude: lat,
        lastLongitude: lng,
        lastLocationAt: new Date()
    });
    
    return { success: true };
  }

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
    
    let savedEmployee;
    try {
      savedEmployee = await this.employeesRepository.save(employee);
    } catch (error) {
      if (error.code === '23505') { // Unique Violation
          const detail = error.detail || '';
          if (detail.includes('cpf')) {
             throw new BadRequestException('CPF já cadastrado.');
          } else if (detail.includes('email')) {
             throw new BadRequestException('Email já cadastrado.');
          } else if (detail.includes('internalCode') || detail.includes('matricula')) {
             throw new BadRequestException('Matrícula Interna já cadastrada.');
          }
      } else if (error.code === '23503') { // Foreign Key Violation
          const detail = error.detail || '';
          if (detail.includes('roleId')) {
             throw new BadRequestException('Cargo selecionado inválido ou inexistente.');
          } else if (detail.includes('supervisorId')) {
             throw new BadRequestException('Supervisor selecionado inválido ou inexistente.');
          }
      }
      console.error('Error creating employee:', error);
      throw error;
    }

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
        validFrom: new Date(),
        weeklyHours: weeklyHours,
        timezone: 'America/Sao_Paulo'
      });
      schedule.employee = savedEmployee;
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

  async findAll(search?: string) {
    const where: any = {};
    if (search) {
        where.fullName = ILike(`%${search}%`);
    }

    const employees = await this.employeesRepository.find({ 
        where,
        relations: ['role', 'supervisor'],
        order: { fullName: 'ASC' },
        take: search ? 50 : undefined // Limit results if searching
    });
    
    // Populate appAccessEnabled for all employees
    // This is not the most efficient way (N+1), but works for now. 
    // Optimization: Fetch all users with employeeId once.
    const users = await this.usersService.findAll(); // Assuming findAll exists and returns all users
    const userEmployeeIds = new Set(users.map(u => u.employee?.id || u.employeeId).filter(id => !!id));

    return employees.map(emp => ({
      ...emp,
      appAccessEnabled: userEmployeeIds.has(emp.id)
    }));
  }

  async findOne(id: string) {
    try {
      const employee = await this.employeesRepository.findOne({ 
        where: { id }, 
        relations: ['role', 'supervisor', 'compensations', 'workSchedules', 'workSchedules.days', 'subordinates'] 
      });

      if (employee) {
        const user = await this.usersService.findByEmployeeId(employee.id);
        (employee as any).appAccessEnabled = !!user;
      }

      return employee;
    } catch (error) {
      console.error(`Error finding employee ${id}:`, error);
      throw new BadRequestException(`Erro ao buscar funcionário: ${error.message}`);
    }
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const { 
      baseSalary, hourlyRate, dailyRate, visitRate, monthlyAllowance, 
      transportVoucher, mealVoucher, chargesPercentage,
      weeklyHours, createAccess, appPassword, roleId, supervisorId, 
      ...employeeData 
    } = updateEmployeeDto;

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
    if (baseSalary !== undefined || hourlyRate !== undefined || dailyRate !== undefined || 
        visitRate !== undefined || monthlyAllowance !== undefined || 
        transportVoucher !== undefined || mealVoucher !== undefined || 
        chargesPercentage !== undefined) {
      const compensations = employee.compensations || [];
      const currentComp = compensations.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime())[0];

      const newSalary = baseSalary !== undefined ? baseSalary : currentComp?.baseSalary;
      const newHourly = hourlyRate !== undefined ? hourlyRate : currentComp?.hourlyRate;
      const newDaily = dailyRate !== undefined ? dailyRate : currentComp?.dailyRate;
      const newVisit = visitRate !== undefined ? visitRate : currentComp?.visitRate;
      const newAllowance = monthlyAllowance !== undefined ? monthlyAllowance : currentComp?.monthlyAllowance;
      const newTransport = transportVoucher !== undefined ? transportVoucher : currentComp?.transportVoucher;
      const newMeal = mealVoucher !== undefined ? mealVoucher : currentComp?.mealVoucher;
      const newCharges = chargesPercentage !== undefined ? chargesPercentage : currentComp?.chargesPercentage;

      // Check if anything changed
      const isDifferent = !currentComp || 
        Number(currentComp.baseSalary) !== Number(newSalary) || 
        Number(currentComp.hourlyRate) !== Number(newHourly) || 
        Number(currentComp.dailyRate) !== Number(newDaily) || 
        Number(currentComp.visitRate) !== Number(newVisit) || 
        Number(currentComp.monthlyAllowance) !== Number(newAllowance) || 
        Number(currentComp.transportVoucher) !== Number(newTransport) || 
        Number(currentComp.mealVoucher) !== Number(newMeal) ||
        Number(currentComp.chargesPercentage) !== Number(newCharges);

      if (isDifferent) {
        const compensation = this.compensationRepository.create({
          validFrom: new Date(),
          remunerationType: 'mensal',
          baseSalary: newSalary || 0,
          hourlyRate: newHourly || 0,
          dailyRate: newDaily || 0,
          visitRate: newVisit || 0,
          monthlyAllowance: newAllowance || 0,
          transportVoucher: newTransport || 0,
          mealVoucher: newMeal || 0,
          chargesPercentage: newCharges || 0
        });
        compensation.employee = employee;
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
          validFrom: new Date(),
          weeklyHours: weeklyHours,
          timezone: 'America/Sao_Paulo'
        });
        schedule.employee = employee;
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
          // Check if user exists with this email
          const existingUser = await this.usersService.findOne(employee.email);
          
          const allRoles = await this.rolesService.findAll();
          let promoterRole = allRoles.find(r => 
              r.name.toLowerCase() === 'promotor' || 
              r.name.toLowerCase() === 'promoter' || 
              r.name.toLowerCase() === 'app_user'
          );

          if (!promoterRole) {
             console.log('Promoter role not found, creating it...');
             try {
                 promoterRole = await this.rolesService.create({
                     name: 'Promotor',
                     description: 'Acesso básico ao aplicativo móvel',
                     accessLevel: 'basic',
                     permissions: []
                 });
             } catch (err) {
                 console.error('Failed to create Promoter role:', err);
                 throw new BadRequestException('Não foi possível criar o perfil de acesso Promotor.');
             }
          }

          if (existingUser) {
              // Check if any OTHER user is already linked to this employee (to avoid unique constraint violation)
              const userLinkedToEmployee = await this.usersService.findByEmployeeId(employee.id);
              if (userLinkedToEmployee && userLinkedToEmployee.id !== existingUser.id) {
                  // Unlink the other user
                  console.warn(`Unlinking employee ${employee.id} from previous user ${userLinkedToEmployee.email}`);
                  await this.usersService.update(userLinkedToEmployee.id, { employeeId: null as any });
              }

              // User exists but not linked to this employee (otherwise hasUser would be true)
              if (!existingUser.employee || !existingUser.employee.id || existingUser.employee.id !== employee.id) {
                  // Link existing user to this employee
                  try {
                      await this.usersService.update(existingUser.id, {
                          employeeId: employee.id,
                          roleId: promoterRole.id, // Ensure they have the right role
                          status: 'active'
                      });
                  } catch (e) {
                      console.error('Error linking user to employee:', e);
                      throw new BadRequestException(`Erro ao vincular usuário: ${e.message}`);
                  }
              } else {
                  console.error(`User with email ${employee.email} is already linked to another employee`);
                  // IMPORTANT: Throw error so frontend knows it failed
                  throw new BadRequestException(`O email ${employee.email} já está vinculado a outro funcionário.`);
              }
          } else {
              // Create User
              // Check if any OTHER user is already linked to this employee
              const userLinkedToEmployee = await this.usersService.findByEmployeeId(employee.id);
              if (userLinkedToEmployee) {
                  // Unlink the other user
                  console.warn(`Unlinking employee ${employee.id} from previous user ${userLinkedToEmployee.email}`);
                  try {
                      await this.usersService.update(userLinkedToEmployee.id, { employeeId: null as any });
                  } catch (e) {
                      console.error('Error unlinking user:', e);
                  }
              }

              try {
                  await this.usersService.create({
                      email: employee.email,
                      password: appPassword || 'mudar123',
                      roleId: promoterRole.id,
                      employeeId: employee.id,
                      status: 'active'
                  });
              } catch (e) {
                  console.error('Error creating user on update:', e);
                  throw new BadRequestException(`Erro ao criar usuário: ${e.message}`);
              }
          }
      } else if (!shouldHaveAccess && hasUser) {
          // Deactivate User and Unlink Employee (instead of deleting to preserve history)
          const user = await this.usersService.findByEmployeeId(id);
          if (user) {
              try {
                  await this.usersService.update(user.id, { 
                       employeeId: null as any,
                       status: 'inactive'
                   });
              } catch (e) {
                  console.error('Error deactivating user:', e);
                  throw new BadRequestException(`Erro ao desativar acesso: ${e.message}`);
              }
          }
      } else if (shouldHaveAccess && hasUser && appPassword) {
          // Update Password
          const user = await this.usersService.findByEmployeeId(id);
          if (user) {
              try {
                  await this.usersService.update(user.id, { password: appPassword });
              } catch (e) {
                  console.error('Error updating password:', e);
                  throw new BadRequestException(`Erro ao atualizar senha: ${e.message}`);
              }
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
    const employee = await this.employeesRepository.findOneBy({ id: data.employeeId });
    if (!employee) {
        throw new NotFoundException(`Employee with ID ${data.employeeId} not found`);
    }

    const compensation = this.compensationRepository.create({
      ...data,
    } as unknown as EmployeeCompensation);
    compensation.employee = employee;
    return this.compensationRepository.save(compensation);
  }

  async findAllDocuments() {
    return this.documentsRepository.find({
      relations: ['employee', 'sender', 'sender.employee'],
      order: { sentAt: 'DESC' }
    });
  }

  async addDocument(data: any) {
    if (!data.employeeId) {
        throw new BadRequestException('ID do funcionário é obrigatório.');
    }
    if (!data.type) {
        throw new BadRequestException('Tipo do documento é obrigatório.');
    }
    if (!data.fileUrl) {
        throw new BadRequestException('Arquivo do documento é obrigatório.');
    }

    const employee = await this.employeesRepository.findOneBy({ id: data.employeeId });
    if (!employee) {
        throw new NotFoundException(`Employee with ID ${data.employeeId} not found`);
    }

    const document = this.documentsRepository.create({
      ...data,
      employeeId: employee.id,
      sentAt: new Date()
    } as unknown as EmployeeDocument);
    document.employee = employee;

    let savedDoc;
    try {
        savedDoc = await this.documentsRepository.save(document);
    } catch (error) {
        console.error('Error saving document:', error);
        throw new BadRequestException(`Erro ao salvar documento: ${error.message}`);
    }

    // Notify logic
    try {
      // If sender is the employee (or undefined, assuming app upload), notify Admins/HR
      // If sender is someone else (Admin/HR), notify the Employee
      const senderIsEmployee = data.senderId ? 
           (await this.usersService.findById(data.senderId))?.employee?.id === data.employeeId 
           : true; // Default to true if no senderId (app upload)

      if (senderIsEmployee) {
          // Notify Admins/HR
          const admins = await this.usersService.findAdminsAndHR();
          for (const admin of admins) {
              await this.notificationsService.create({
                  userId: admin.id,
                  title: 'Novo Documento de Funcionário',
                  message: `O funcionário ${employee.fullName} enviou um documento: ${data.type} - ${data.description || ''}`,
                  type: 'document_received',
                  relatedId: (savedDoc as any).id
              });
          }
      } else {
          // Notify Employee (User)
          const user = await this.usersService.findByEmployeeId(data.employeeId);
          if (user && user.id !== data.senderId) {
            await this.notificationsService.create({
              userId: user.id,
              title: 'Novo Documento Recebido',
              message: `Você recebeu um novo documento: ${data.type} - ${data.description || ''}`,
              type: 'document',
              relatedId: (savedDoc as any).id
            });
          }
      }
    } catch (e) {
      console.error('Error notifying about document:', e);
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

  async sendBulkDocuments(data: any) {
    console.log('Processing bulk documents for:', data);
    let targetEmployeeIds: string[] = [];

    if (data.sendToAll === true || data.sendToAll === 'true') {
        const allEmployees = await this.employeesRepository.find();
        targetEmployeeIds = allEmployees.map(e => e.id);
        console.log(`Sending to all ${targetEmployeeIds.length} employees`);
    } else {
        if (typeof data.employeeIds === 'string') {
            // Check if it's a comma-separated string
            if (data.employeeIds.includes(',')) {
                targetEmployeeIds = data.employeeIds.split(',').map(id => id.trim());
            } else {
                try {
                    // Try to parse if it's a JSON array string
                    const parsed = JSON.parse(data.employeeIds);
                    targetEmployeeIds = Array.isArray(parsed) ? parsed : [data.employeeIds];
                } catch {
                    // If not JSON, assume single ID string
                    targetEmployeeIds = [data.employeeIds];
                }
            }
        } else if (Array.isArray(data.employeeIds)) {
            targetEmployeeIds = data.employeeIds;
        }
    }

    // Filter unique IDs and remove empty ones
    targetEmployeeIds = [...new Set(targetEmployeeIds)].filter(id => id);
    console.log('Target Employee IDs:', targetEmployeeIds);

    if (targetEmployeeIds.length === 0) {
        console.warn('No target employees found/selected');
        throw new BadRequestException('Nenhum funcionário selecionado.');
    }

    const results = [];
    for (const empId of targetEmployeeIds) {
        try {
            const doc = await this.addDocument({
                ...data,
                employeeId: empId
            });
            results.push({ status: 'success', employeeId: empId, documentId: doc.id });
        } catch (err) {
            console.error(`Failed to send document to employee ${empId}:`, err);
            results.push({ status: 'error', employeeId: empId, error: err.message });
        }
    }
    console.log('Bulk send results:', results);
    return results;
  }
}
