import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Reputacion de un reportante. Es lo que sostiene la calidad del loop de datos
 * por comunidad: los reportes de buena reputacion pesan mas.
 */
@Entity('reporter_reputations')
export class ReporterReputationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, nullable: false })
  reporterId: string;

  /** Puntos acumulados. */
  @Column({ type: 'int', default: 0 })
  points: number;

  /** Reportes enviados en total. */
  @Column({ type: 'int', default: 0 })
  reportsCount: number;

  /** Reportes aceptados. */
  @Column({ type: 'int', default: 0 })
  acceptedCount: number;

  /** Reportes rechazados. */
  @Column({ type: 'int', default: 0 })
  rejectedCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
