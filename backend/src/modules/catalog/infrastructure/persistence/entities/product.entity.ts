import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { BrandEntity } from './brand.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  categoryId: string;

  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity;

  @Column({ type: 'uuid', nullable: false })
  brandId: string;

  @ManyToOne(() => BrandEntity)
  @JoinColumn({ name: 'brandId' })
  brand: BrandEntity;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 14, nullable: true })
  eanCode: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'UNIT' })
  measurementUnit: string; // 'KG', 'LITER', 'UNIT', 'GRAM'

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: false, default: 1.0 })
  contentValue: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
