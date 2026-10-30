'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, ShieldCheck, Sparkles, Award, Clock } from 'lucide-react';
import { submitEvidence, EvidenceResult, fetchReputation } from '@/lib/api';
import { useSupermarketStore } from '@/store/useSupermarketStore';

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Array<{ branchId: string; supermarketName: string; branchName: string; address: string }>;
  products: Array<{ productId: string; name: string; brand: string; eanCode: string }>;
}

const MAX_IMAGE_DIMENSION = 1280;

/**
 * Reduce la imagen antes de enviarla: un ticket de 4 MB en base64 no viaja bien
 * y no aporta nada para la validacion.
 */
async function fileToCompressedBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
      img.src = dataUrl;
    });

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    // Si no se puede redimensionar, se manda la original.
    return dataUrl;
  }
}

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  isOpen,
  onClose,
  stores,
  products,
}) => {
  const { reporterId, setReputationPoints } = useSupermarketStore();
  const [file, setFile] = useState<File | null>(null);
  const [branchId, setBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [reportedPrice, setReportedPrice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.productId === productId);
  const selectedStore = stores.find((s) => s.branchId === branchId);

  const handleSubmit = async () => {
    if (!branchId || !productId || !reportedPrice) {
      setError('Elegí sucursal, producto y precio.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const imageBase64 = file ? await fileToCompressedBase64(file) : undefined;

      const response = await submitEvidence({
        branchId,
        reporterId,
        productId,
        reportedPrice: Number(reportedPrice),
        imageBase64,
        purchasedAt: new Date().toISOString(),
      });

      setResult(response);

      // Refresca los puntos de reputacion del reportante.
      const reputation = await fetchReputation(reporterId).catch(() => null);
      if (reputation) setReputationPoints(reputation.points);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'No se pudo enviar la evidencia.';
      setError(Array.isArray(message) ? message.join(' ') : String(message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setReportedPrice('');
  };

  const statusStyles: Record<string, string> = {
    APPROVED: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    PENDING: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    REJECTED: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-700/80 overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Subir Evidencia de Precios</h2>
              <p className="text-xs text-slate-400">Validación automática por TrustScore</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {!result ? (
            <>
              {/* Sucursal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">¿Dónde compraste?</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/60"
                >
                  <option value="">Elegí sucursal…</option>
                  {stores.map((store) => (
                    <option key={store.branchId} value={store.branchId}>
                      {store.supermarketName} — {store.branchName}
                    </option>
                  ))}
                </select>
                {selectedStore && (
                  <p className="text-[11px] text-slate-500">{selectedStore.address}</p>
                )}
              </div>

              {/* Producto */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">¿Qué producto?</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/60"
                >
                  <option value="">Elegí producto…</option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.name} — {product.brand}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="text-[11px] text-slate-500">EAN: {selectedProduct.eanCode}</p>
                )}
              </div>

              {/* Precio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">¿Qué precio viste?</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reportedPrice}
                  onChange={(e) => setReportedPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500/60"
                />
              </div>

              {/* Archivo */}
              <label className="block border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl p-6 text-center bg-slate-900/40 transition cursor-pointer">
                <FileText className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(0)} KB · tocá para cambiar
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-200">
                      Adjuntá la foto del ticket o de la góndola
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPG o PNG · se redimensiona antes de enviarse
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-brand-400">
                  <ShieldCheck className="w-4 h-4" />
                  Cómo se valida tu reporte:
                </div>
                <p className="text-slate-400">
                  Cada reporte recibe un <strong className="text-slate-200">TrustScore</strong> (0-100)
                  que pondera la evidencia, la coherencia con el precio conocido y tu reputación. Con 85 o
                  más, el precio se aplica a la sucursal y sumás puntos. Con menos, queda en revisión.
                </p>
              </div>

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isProcessing || !branchId || !productId || !reportedPrice}
                className="w-full py-3 px-6 rounded-xl gradient-bg text-white font-bold text-xs shadow-glow hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Validando evidencia...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enviar evidencia
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
                  result.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : result.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}
              >
                {result.status === 'APPROVED' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
              </div>

              <div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider inline-block px-2 py-0.5 rounded-md border ${statusStyles[result.status]}`}
                >
                  {result.status === 'APPROVED'
                    ? 'Validado'
                    : result.status === 'PENDING'
                      ? 'En revisión'
                      : 'Rechazado'}
                </span>
                <h3 className="text-lg font-extrabold text-slate-100 mt-2">
                  {result.product?.name ?? 'Reporte registrado'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {result.branch?.supermarketName} · {result.branch?.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">TrustScore</span>
                  <div className="text-xl font-extrabold text-brand-400">{result.trustScore}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Puntos</span>
                  <div className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                    <Award className="w-5 h-5 text-amber-400" />+{result.pointsAwarded} pts
                  </div>
                </div>
              </div>

              {result.priceChanged && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  Precio actualizado: {result.previousPrice} → {result.currentPrice}
                </p>
              )}

              {/* Desglose del score */}
              <div className="text-left p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cómo se calculó el TrustScore
                </span>
                {result.factors.map((factor) => (
                  <div key={factor.factor} className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="text-slate-300">
                      <strong className="text-slate-200">{factor.factor}</strong> — {factor.detail}
                    </span>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        factor.points > 0
                          ? 'text-emerald-400'
                          : factor.points < 0
                            ? 'text-rose-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {factor.points > 0 ? '+' : ''}
                      {factor.points}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500">{result.message}</p>

              <button
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Subir otro ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
