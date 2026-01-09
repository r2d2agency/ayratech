import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './entities/employee.entity';
import { EmployeeCompensation } from './entities/employee-compensation.entity';
import { EmployeeDocument } from './entities/employee-document.entity';
import { WorkSchedule } from '../work-schedules/entities/work-schedule.entity';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeCompensation, EmployeeDocument, WorkSchedule]),
    UsersModule,
    RolesModule
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
