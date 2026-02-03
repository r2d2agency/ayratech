import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class AiConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string; // 'gemini' | 'openai'

  @Column()
  apiKey: string;

  @Column({ nullable: true })
  model: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
