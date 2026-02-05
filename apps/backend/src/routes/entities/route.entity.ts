import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { RouteItem } from './route-item.entity';

@Entity()
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', nullable: true })
  date: string;

  @ManyToOne(() => Employee, { eager: true, nullable: true })
  @JoinColumn({ name: 'promoterId' })
  promoter: Employee;

  @Column({ nullable: true })
  promoterId: string;

  @ManyToMany(() => Employee, { eager: true })
  @JoinTable({
    name: 'route_promoters',
    joinColumn: { name: 'routeId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employeeId', referencedColumnName: 'id' }
  })
  promoters: Employee[];

  @Column({ default: 'DRAFT' }) // DRAFT, CONFIRMED, COMPLETED
  status: string;

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ nullable: true })
  templateName: string;

  @OneToMany(() => RouteItem, (item) => item.route, { cascade: true, eager: true })
  items: RouteItem[];
}
