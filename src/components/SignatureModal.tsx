import React, { useRef, useState, useEffect } from 'react';
import { OfficialPerson } from '../types/election';
import { formatJalali, computeSHA256 } from '../utils/persian';
import { audioFeedback } from '../utils/audioFeedback';
import { PenTool, Check, RotateCcw, X, ShieldCheck } from 'lucide-react';

interface SignatureModalProps {
  person: OfficialPerson;
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (personId: string, signatureDataUrl: string, signedAt: string, digitalToken: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  person,
  isOpen,
  onClose,
  onSaveSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSealing, setIsSealing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(initCanvas, 50);
    }
  }, [isOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 450;
    canvas.height = 200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle guide line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 160);
    ctx.lineTo(canvas.width - 30, 160);
    ctx.stroke();

    setHasDrawn(false);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent<HTMLCanvasElement>).clientX - rect.left,
        y: (e as React.MouseEvent<HTMLCanvasElement>).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a'; // dark navy ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  const handleConfirmSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    setIsSealing(true);

    const dataUrl = canvas.toDataURL('image/png');
    const nowIso = new Date().toISOString();
    // Compute cryptographic token for the signature
    const signatureToken = await computeSHA256(`${person.id}:${person.nationalIdMasked}:${nowIso}:${dataUrl.slice(-100)}`);

    audioFeedback.playSignatureSuccess();
    onSaveSignature(person.id, dataUrl, nowIso, signatureToken.slice(0, 16).toUpperCase());
    setIsSealing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">پد امضای دیجیتال و تایید قانونی</h3>
              <p className="text-xs text-slate-400">ثبت امضای الکترونیک برای صورتجلسه رسمی</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Person details */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/80 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">امضاکننده: </span>
              <strong className="text-white text-sm mr-1">{person.name}</strong>
              <div className="text-emerald-400 mt-0.5">{person.role} ({person.organization})</div>
            </div>
            <div className="text-left font-mono text-slate-400">
              <div>کد ملی: {person.nationalIdMasked}</div>
              <div className="text-[10px] text-slate-500">{formatJalali(new Date(), false)}</div>
            </div>
          </div>

          {/* Canvas container */}
          <div>
            <div className="flex justify-between items-center mb-1.5 text-xs text-slate-300">
              <span>لطفاً امضای خود را با قلم نوری، لمس یا ماوس رسم کنید:</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-slate-400 hover:text-amber-400 flex items-center gap-1 text-[11px] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>پاک کردن</span>
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-600 bg-white shadow-inner relative touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full cursor-crosshair block"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs">
                  محل درج امضا
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              این امضا به همراه برچسب زمان دقیق و کلید هش منحصربه‌فرد، به صورت غیرقابل جعل ضمیمه صورتجلسه خواهد شد.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleConfirmSignature}
              disabled={!hasDrawn || isSealing}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-700/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSealing ? 'در حال ثبت و پلمپ...' : 'ثبت و تایید قطعی امضا'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
