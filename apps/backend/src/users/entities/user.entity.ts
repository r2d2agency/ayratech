import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string; // email_login

  @Column({ name: 'password_hash' })
  password: string; // password_hash

  @Column({ nullable: true, insert: false, update: false })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column({ nullable: true, insert: false, update: false })
  roleId: string;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
