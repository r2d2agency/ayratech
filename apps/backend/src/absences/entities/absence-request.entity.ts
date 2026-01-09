import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('absence_requests')
export class AbsenceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ insert: false, update: false })
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column()
  type: string; // falta | atestado | atraso | saída_antecipada | folga

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  fileUrl: string; // MinIO

  @Column({ default: 'pending' })
  status: string; // pendente | aprovado | recusado

  @Column({ nullable: true, insert: false, update: false })
  approverId: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver: Employee;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
