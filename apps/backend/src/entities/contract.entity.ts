import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Client } from '../entities/client.entity';

@Entity()
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  value: number;

  @Column({ default: true })
  status: boolean;

  @ManyToOne(() => Client, { eager: true })
  client: Client;

  @Column()
  clientId: string;
}
