import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Client } from './client.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  sku: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  image: string;

  @ManyToOne(() => Client, (client) => client.products)
  client: Client;
}
