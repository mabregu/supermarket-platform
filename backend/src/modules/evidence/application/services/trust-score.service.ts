import { Injectable } from '@nestjs/common';

export interface TrustScoreInput {
  hasImage: boolean;
  branchKnown: boolean;
  productKnown: boolean;
  /** Precio que el usuario declara. */
  reportedPrice: number;
  /** Precio que ya teniamos (si hay). */
  knownPrice: number | null;
  /** El ticket (OCR o items provistos) contiene el mismo producto al mismo precio. */
  corroboratedByReceipt: boolean;
  /** Reputacion previa del reportante: reportes aceptados / totales. */
  reporterAcceptanceRate: number;
}

export interface TrustScoreResult {
  score: number;
  factors: Array<{ factor: string; points: number; detail: string }>;
  decision: 'APPROVED' | 'PENDING' | 'REJECTED';
}

/**
 * Umbrales de decision.
 * - APPROVED: el reporte se aplica al precio de la sucursal.
 * - PENDING  : se guarda para revision, no modifica el precio.
 * - REJECTED : se descarta (no suma reputacion).
 */
export const TRUST_THRESHOLDS = { approved: 85, pending: 60 } as const;

/**
 * Calcula el TrustScore de un reporte de precio.
 *
 * La idea: no trusting ciegamente al usuario. Cada factor suma o resta
 * puntos verificables, y la reputacion previa modula el resultado.
 */
@Injectable()
export class TrustScoreService {
  evaluate(input: TrustScoreInput): TrustScoreResult {
    const factors: TrustScoreResult['factors'] = [];
    // Base conservadora: sin evidencia extra el reporte no llega al umbral de aprobacion.
    let score = 25;

    const add = (factor: string, points: number, detail: string) => {
      score += points;
      factors.push({ factor, points, detail });
    };

    if (input.hasImage) {
      add('EVIDENCIA', 20, 'Incluye imagen del ticket o gondola.');
    } else {
      factors.push({ factor: 'EVIDENCIA', points: 0, detail: 'Sin imagen: no se puede verificar.' });
    }

    if (input.branchKnown) {
      add('SUCURSAL', 10, 'La sucursal existe en el catalogo.');
    } else {
      factors.push({ factor: 'SUCURSAL', points: 0, detail: 'Sucursal desconocida.' });
    }

    if (input.productKnown) {
      add('PRODUCTO', 10, 'El EAN existe en el catalogo.');
    } else {
      factors.push({ factor: 'PRODUCTO', points: 0, detail: 'EAN no reconocido.' });
    }

    if (input.corroboratedByReceipt) {
      add('CORROBORACION', 15, 'El ticket contiene el mismo producto al mismo precio.');
    }

    if (input.knownPrice !== null && input.knownPrice > 0) {
      const deviation = Math.abs(input.reportedPrice - input.knownPrice) / input.knownPrice;
      if (deviation <= 0.1) {
        add('COHERENCIA', 20, `Coincide con el precio conocido (${(deviation * 100).toFixed(1)}% de diferencia).`);
      } else if (deviation <= 0.25) {
        add('COHERENCIA', 10, `Cerca del precio conocido (${(deviation * 100).toFixed(1)}% de diferencia).`);
      } else if (deviation <= 0.5) {
        add('COHERENCIA', 0, `Diffiere ${(deviation * 100).toFixed(1)}% del precio conocido.`);
      } else {
        add(
          'COHERENCIA',
          -15,
          `Diffiere ${(deviation * 100).toFixed(1)}% del precio conocido: probablemente otro producto.`,
        );
      }
    } else {
      // Sin precio de referencia no hay con que comparar: aporta poco.
      add('COHERENCIA', 5, 'Sin precio previo de referencia para comparar.');
    }

    const reputationPoints = Math.round(input.reporterAcceptanceRate * 10);
    if (reputationPoints > 0) {
      add(
        'REPUTACION',
        reputationPoints,
        `Reportante con ${(input.reporterAcceptanceRate * 100).toFixed(0)}% de reportes aceptados.`,
      );
    }

    score = Math.max(0, Math.min(100, score));

    const decision =
      score >= TRUST_THRESHOLDS.approved ? 'APPROVED' : score >= TRUST_THRESHOLDS.pending ? 'PENDING' : 'REJECTED';

    return { score, factors, decision };
  }
}
