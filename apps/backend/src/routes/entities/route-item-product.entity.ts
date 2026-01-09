import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RouteItem } from './route-item.entity';
import { Product } from '../../entities/product.entity';

@Entity()
export class RouteItemProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RouteItem, (item) => item.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeItemId' })
  routeItem: RouteItem;

  @Column({ insert: false, update: false })
  routeItemId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ insert: false, update: false })
  productId: string;

  @Column({ default: false })
  checked: boolean;

  @Column({ default: false })
  isStockout: boolean;

  @Column({ nullable: true })
  stockoutType: string; // 'VIRTUAL', 'PHYSICAL'

  @Column('simple-array', { nullable: true })
  photos: string[];

  @Column({ nullable: true })
  observation: string;
}
