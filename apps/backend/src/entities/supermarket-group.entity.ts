import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Supermarket } from './supermarket.entity';

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
}
