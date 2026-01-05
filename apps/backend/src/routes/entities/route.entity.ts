import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RouteItem } from './route-item.entity';

@Entity()
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => User, { eager: true })
  promoter: User;

  @Column()
  promoterId: string;

  @Column({ default: 'PLANNING' }) // PLANNING, IN_PROGRESS, COMPLETED
  status: string;

  @OneToMany(() => RouteItem, (item) => item.route, { cascade: true, eager: true })
  items: RouteItem[];
}
