import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { StoreBranchEntity } from './store-branch.entity';

@Entity('supermarkets')
export class SupermarketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteUrl: string;

  @OneToMany(() => StoreBranchEntity, (branch) => branch.supermarket)
  branches: StoreBranchEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
