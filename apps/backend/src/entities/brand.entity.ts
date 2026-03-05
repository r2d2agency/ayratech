import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Client } from './client.entity';
import { Product } from './product.entity';

import { ChecklistTemplate } from '../checklists/entities/checklist-template.entity';

@Entity()
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ nullable: true, insert: false, update: false })
  clientId: string;

  @ManyToOne(() => ChecklistTemplate, { nullable: true })
  @JoinColumn({ name: 'checklistTemplateId' })
  checklistTemplate: ChecklistTemplate;

  @Column({ nullable: true })
  checklistTemplateId: string;

  @Column({ default: false })
  waitForStockCount: boolean;

  @Column({ nullable: true })
  stockNotificationContact: string;

  @Column({ nullable: true })
  inventoryFrequency: string; // 'daily', 'weekly', 'biweekly', 'monthly'

  @OneToMany(() => Product, product => product.brand)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
