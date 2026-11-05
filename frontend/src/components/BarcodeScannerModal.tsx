'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Barcode, AlertCircle, Sparkles, Check } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isScanning = true;
    let detector: any = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
      } catch (err) {
        console.warn('BarcodeDetector format not supported', err);
      }
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (!isScanning) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setHasCameraPermission(true);

        if (detector) {
          const scanInterval = setInterval(async () => {
            if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  clearInterval(scanInterval);
                  setDetectedCode(rawValue);
                  if (typeof navigator.vibrate === 'function') {
                    navigator.vibrate(100);
                  }
                  setTimeout(() => {
                    onDetected(rawValue);
                    onClose();
                  }, 800);
                }
              }
            } catch (scanErr) {
              // Frame dropped or unreadable, continue
            }
          }, 250);

          return () => clearInterval(scanInterval);
        }
      } catch (err: any) {
        setHasCameraPermission(false);
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Podés ingresar el código EAN manualmente.'
            : 'No se pudo acceder a la cámara en este dispositivo.',
        );
      }
    }

    startCamera();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      isScanning = false;
      window.removeEventListener('keydown', onKey);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onClose, onDetected]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (clean) {
      onDetected(clean);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-700/80 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white shadow-glow">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Escanear Código de Barras</h2>
              <p className="text-[11px] text-slate-400">Apuntá al producto para comparar precios</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Camera */}
        <div className="p-4 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {detectedCode ? (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-400 z-20 space-y-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                  <Check className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-sm">¡Código Detectado!</span>
                <span className="font-mono text-xs bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-white">
                  {detectedCode}
                </span>
              </div>
            ) : null}

            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Targeting overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-1/2 border-2 border-brand-500/60 rounded-xl relative shadow-glow animate-pulse">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-400" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-400" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-400" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-400" />
              </div>
            </div>

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center z-10 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-slate-300">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400">
              O escribí el código de barras (EAN):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: 7792180001665"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500/60 font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 transition disabled:opacity-40"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

