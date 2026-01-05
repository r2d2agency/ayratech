import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column()
  type: string; // holerite | contrato | advertencia | comunicado

  @Column({ nullable: true })
  competence: string; // competencia (YYYY-MM)

  @Column()
  fileUrl: string; // arquivo_url

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date; // enviado_em

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date; // lido_em

  @CreateDateColumn()
  createdAt: Date;
}
