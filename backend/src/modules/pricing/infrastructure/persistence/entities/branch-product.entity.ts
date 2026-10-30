import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StoreBranchEntity } from '../../../../stores/infrastructure/persistence/entities/store-branch.entity';
import { ProductEntity } from '../../../../catalog/infrastructure/persistence/entities/product.entity';

@Entity('branch_products')
@Unique(['branchId', 'productId'])
export class BranchProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  branchId: string;

  @ManyToOne(() => StoreBranchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: StoreBranchEntity;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  productId: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ProductEntity;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  currentPrice: number;

  /**
   * Precio de lista (sin promocion). Si es mayor que currentPrice, hay promocion
   * activa: currentPrice es el mejor precio disponible y este el precio "regular".
   */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  listPrice: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  unitPrice: number;

  @Column({ type: 'boolean', default: true })
  inStock: boolean;

  /**
   * Confianza en el precio (0-100). Las fuentes oficiales (SEPA) arrancan en 100;
   * los reportes de usuarios arrancan bajos y suben con la reputacion.
   */
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 100.0 })
  trustScore: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastUpdatedAt: Date;
}
