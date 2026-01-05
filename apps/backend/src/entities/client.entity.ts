import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'razao_social' })
  razaoSocial: string;

  @Column({ name: 'nome_fantasia', nullable: true })
  nomeFantasia: string;

  @Column({ nullable: true })
  cnpj: string;

  @Column({ name: 'email_principal', nullable: true })
  emailPrincipal: string;

  @Column({ name: 'telefone_principal', nullable: true })
  telefonePrincipal: string;

  @Column({ default: 'ativo' })
  status: string; // ativo | inativo | suspenso

  @Column({ nullable: true })
  logradouro: string;

  @Column({ nullable: true })
  numero: string;

  @Column({ nullable: true })
  bairro: string;

  @Column({ nullable: true })
  cidade: string;

  @Column({ nullable: true })
  estado: string;

  @Column({ nullable: true })
  cep: string;

  @Column({ nullable: true })
  logo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.client)
  products: Product[];
}
