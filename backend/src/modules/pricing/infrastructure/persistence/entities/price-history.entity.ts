import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('price_history')
export class PriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  branchProductId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  price: number;

  /** Precio de lista congelado en el momento de la observacion (si habia promocion). */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  listPrice: number | null;

  @Column({ type: 'varchar', length: 30, nullable: false })
  source: string; // 'SEPA', 'USER_TICKET', 'USER_PHOTO', 'FLYER'

  /**
   * Cuando la FUENTE observo el precio (dia de publicacion de SEPA, fecha del ticket).
   * Distinto de createdAt, que es cuando nosotros lo escribimos.
   */
  @Column({ type: 'timestamptz', nullable: true })
  sourceDate: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reportedByUserId: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
