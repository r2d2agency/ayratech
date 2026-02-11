import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Supermarket } from '../../entities/supermarket.entity';

@Entity()
export class SupermarketGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: true })
  status: boolean;

  @OneToMany(() => Supermarket, (supermarket) => supermarket.group)
  supermarkets: Supermarket[];

  @ManyToMany(() => Product, (product) => product.supermarketGroups)
  products: Product[];
}
