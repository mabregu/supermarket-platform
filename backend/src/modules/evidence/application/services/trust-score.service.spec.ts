import { TrustScoreService, TRUST_THRESHOLDS } from './trust-score.service';

describe('TrustScoreService', () => {
  let service: TrustScoreService;

  beforeEach(() => {
    service = new TrustScoreService();
  });

  const base = {
    hasImage: true,
    branchKnown: true,
    productKnown: true,
    reportedPrice: 1000,
    knownPrice: 1000,
    corroboratedByReceipt: false,
    reporterAcceptanceRate: 0,
  };

  it('aprueba un reporte completo y coherente', () => {
    const result = service.evaluate({ ...base, corroboratedByReceipt: true });

    expect(result.score).toBeGreaterThanOrEqual(TRUST_THRESHOLDS.approved);
    expect(result.decision).toBe('APPROVED');
  });

  it('rechaza un reporte sin imagen y con precio muy distinto', () => {
    const result = service.evaluate({
      ...base,
      hasImage: false,
      reportedPrice: 5000,
      knownPrice: 1000,
    });

    expect(result.decision).toBe('REJECTED');
  });

  it('deja en revision un reporte sin imagen pero coherente', () => {
    const result = service.evaluate({ ...base, hasImage: false, corroboratedByReceipt: false });

    expect(result.decision).toBe('PENDING');
  });

  it('resta puntos si el precio se va de rango', () => {
    const coherente = service.evaluate({ ...base });
    const absurdo = service.evaluate({ ...base, reportedPrice: 3000 });

    expect(absurdo.score).toBeLessThan(coherente.score);
  });

  it('suma puntos por reputacion previa del reportante', () => {
    const sinReputacion = service.evaluate({ ...base });
    const conReputacion = service.evaluate({ ...base, reporterAcceptanceRate: 1 });

    expect(conReputacion.score).toBeGreaterThan(sinReputacion.score);
  });

  it('nunca supera 100 ni baja de 0', () => {
    const max = service.evaluate({ ...base, corroboratedByReceipt: true, reporterAcceptanceRate: 1 });
    const min = service.evaluate({ ...base, hasImage: false, reportedPrice: 100000, knownPrice: 1 });

    expect(max.score).toBeLessThanOrEqual(100);
    expect(min.score).toBeGreaterThanOrEqual(0);
  });

  it('explica cada factor para que el usuario entienda la decision', () => {
    const result = service.evaluate({ ...base });

    expect(result.factors.length).toBeGreaterThan(3);
    expect(result.factors.map((f) => f.factor)).toEqual(
      expect.arrayContaining(['EVIDENCIA', 'SUCURSAL', 'PRODUCTO', 'COHERENCIA']),
    );
  });
});
