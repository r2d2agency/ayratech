import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Route } from './route.entity';
import { Supermarket } from '../../entities/supermarket.entity';

@Entity()
export class RouteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Route, (route) => route.items, { onDelete: 'CASCADE' })
  route: Route;

  @Column()
  routeId: string;

  @ManyToOne(() => Supermarket, { eager: true, onDelete: 'CASCADE' })
  supermarket: Supermarket;

  @Column()
  supermarketId: string;

  @Column()
  order: number;

  @Column({ default: 'PENDING' }) // PENDING, CHECKIN, CHECKOUT, SKIPPED
  status: string;

  @Column({ nullable: true, type: 'timestamp' })
  checkInTime: Date;

  @Column({ nullable: true, type: 'timestamp' })
  checkOutTime: Date;
}
