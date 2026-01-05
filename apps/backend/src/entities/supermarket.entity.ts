import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Supermarket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fantasyName: string;

  @Column()
  franchise: string;

  @Column()
  classification: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column({ default: true })
  status: boolean;
}
