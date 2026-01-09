import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Client } from './client.entity';
import { Brand } from './brand.entity';
import { Category } from '../categories/entities/category.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  sku: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  barcode: string;

  @ManyToOne(() => Client, (client) => client.products)
  client: Client;

  @ManyToOne(() => Brand, (brand) => brand.products, { nullable: true })
  brand: Brand;

  @ManyToOne(() => Category, { nullable: true })
  categoryRef: Category;
}
