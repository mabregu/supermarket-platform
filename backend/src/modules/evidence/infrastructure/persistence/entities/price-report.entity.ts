import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Reporte de precio enviado por un usuario (evidencia: foto de ticket o gondola).
 *
 * Es el segundo origen de datos de la plataforma, complementando a SEPA:
 * cubre comercios de barrio que no publican en la base oficial.
 */
@Entity('price_reports')
export class PriceReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  branchId: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  productId: string;

  /** Identificador del reportante. Sin auth, es un id que el cliente se genera y persiste. */
  @Index()
  @Column({ type: 'varchar', length: 120, nullable: false })
  reporterId: string;

  /** Precio que el usuario reporto. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  reportedPrice: number;

  /** Precio de lista declarado por el usuario (opcional, para promo). */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  reportedListPrice: number | null;

  /** URL o data URI de la imagen de la evidencia. */
  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  /** Confianza calculada (0-100) al momento de recibir el reporte. */
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: false })
  trustScore: number;

  /** Puntos de reputacion otorgados al reportante. */
  @Column({ type: 'int', default: 0 })
  pointsAwarded: number;

  /** PENDING | APPROVED | REJECTED */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'PENDING' })
  status: string;

  /** Motivo del rechazo o notas del procesamiento (JSON). */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
