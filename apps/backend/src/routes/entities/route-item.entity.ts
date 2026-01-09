import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Route } from './route.entity';
import { Supermarket } from '../../entities/supermarket.entity';
import { RouteItemProduct } from './route-item-product.entity';

@Entity()
export class RouteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Route, (route) => route.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column({ insert: false, update: false })
  routeId: string;

  @ManyToOne(() => Supermarket, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supermarketId' })
  supermarket: Supermarket;

  @Column({ insert: false, update: false })
  supermarketId: string;

  @Column()
  order: number;

  @Column({ nullable: true })
  startTime: string; // HH:mm

  @Column({ nullable: true })
  estimatedDuration: number; // in minutes

  @Column({ default: 'PENDING' }) // PENDING, CHECKIN, CHECKOUT, SKIPPED
  status: string;

  @Column({ nullable: true, type: 'timestamp' })
  checkInTime: Date;

  @Column({ nullable: true, type: 'timestamp' })
  checkOutTime: Date;

  @OneToMany(() => RouteItemProduct, (product) => product.routeItem, { cascade: true, eager: true })
  products: RouteItemProduct[];
}
