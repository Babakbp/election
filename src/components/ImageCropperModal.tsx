import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Check, 
  Move, 
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCrop: (croppedDataUrl: string) => void;
  initialImageUrl?: string;
  title?: string;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  onConfirmCrop,
  initialImageUrl,
  title = 'انتخاب و تنظیم تصویر کاندیدا در کادر',
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageUrl || null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync image source whenever modal opens with a new initialImageUrl
  useEffect(() => {
    if (isOpen) {
      setImageSrc(initialImageUrl || null);
      setPosition({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, initialImageUrl]);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      imageObjRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setPosition({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      drawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle local file selection from computer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP) انتخاب نمایید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setImageSrc(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Redraw canvas with pan, zoom, rotation, and circular/square frame
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Center transform
    ctx.translate(width / 2 + position.x, height / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw the image centered
    const aspect = img.width / img.height;
    let drawW = width;
    let drawH = width / aspect;
    if (drawH < height) {
      drawH = height;
      drawW = height * aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw overlay mask with clear portrait frame in the center
    const cropSize = Math.min(width, height) * 0.75;
    const cropX = (width - cropSize) / 2;
    const cropY = (height - cropSize) / 2;

    // Dark semi-transparent mask outside crop area
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    // Cut out the circle or rounded rect
    ctx.arc(width / 2, height / 2, cropSize / 2, 0, Math.PI * 2, true);
    ctx.fill();

    // Frame border
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle guide crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, cropY);
    ctx.lineTo(width / 2, cropY + cropSize);
    ctx.moveTo(cropX, height / 2);
    ctx.lineTo(cropX + cropSize, height / 2);
    ctx.stroke();

    ctx.restore();
  }, [position, zoom, rotation]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Dragging / Panning handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile/tablet screens
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Produce final cropped image
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const width = canvas.width;
    const height = canvas.height;
    const cropSize = Math.min(width, height) * 0.75;
    const cropX = (width - cropSize) / 2;
    const cropY = (height - cropSize) / 2;

    // Create an offscreen canvas of 300x300 for crisp portrait export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 320;
    exportCanvas.height = 320;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // Background fill
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, 320, 320);

    // Calculate scale factor between display canvas and export canvas
    const scaleFactor = 320 / cropSize;

    expCtx.save();
    expCtx.translate(160 + position.x * scaleFactor, 160 + position.y * scaleFactor);
    expCtx.rotate((rotation * Math.PI) / 180);
    expCtx.scale(zoom * scaleFactor, zoom * scaleFactor);

    const aspect = img.width / img.height;
    let drawW = width;
    let drawH = width / aspect;
    if (drawH < height) {
      drawH = height;
      drawW = height * aspect;
    }

    expCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    expCtx.restore();

    const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
    onConfirmCrop(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-slate-800/80 border-b border-slate-700/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">جابجایی، بزرگ‌نمایی و تنظیم چهره در کادر رسمی پرتره</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* File Picker from Computer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <div className="text-xs text-slate-300">
              <span className="font-semibold block">تصویر دلخواه خود را از حافظه کامپیوتر بارگذاری کنید:</span>
              <span className="text-[11px] text-slate-400">فرمت‌های JPG، PNG و WEBP پشتیبانی می‌شوند.</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/40 transition flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>انتخاب از کامپیوتر</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Interactive Canvas Viewer */}
          <div 
            onClick={() => {
              if (!imageSrc) fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  if (typeof evt.target?.result === 'string') {
                    setImageSrc(evt.target.result);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            className={`relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-inner flex items-center justify-center select-none ${!imageSrc ? 'cursor-pointer hover:border-emerald-500/70 transition' : 'touch-none'}`}
          >
            <canvas
              ref={canvasRef}
              width={420}
              height={320}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`block max-w-full h-auto ${!imageSrc ? 'hidden' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            />

            {!imageSrc && (
              <div className="py-16 px-6 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-sm">انتخاب عکس از حافظه سیستم</h5>
                  <p className="text-xs text-slate-400 mt-1">جهت انتخاب فایل کلیک کنید یا تصویر را به این کادر بکشید و رها کنید</p>
                </div>
                <span className="inline-block px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px] font-mono border border-slate-700">
                  فرمت‌های JPG، PNG، WEBP
                </span>
              </div>
            )}

            {/* Instruction tooltip badge */}
            {imageSrc && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm border border-slate-700 px-3 py-1 rounded-full text-[10px] text-slate-300 flex items-center gap-1.5 pointer-events-none">
                <Move className="w-3 h-3 text-emerald-400" />
                <span>با کشیدن ماوس، تصویر را جابجا کنید</span>
              </div>
            )}
          </div>

          {/* Adjustment Toolbar (Zoom, Rotate, Reset) */}
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
                <ZoomOut className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Rotate button */}
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  title="چرخش ۹۰ درجه تصویر"
                >
                  <RotateCw className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">چرخش</span>
                </button>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  title="بازنشانی موقعیت به مرکز"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">وسط‌چین</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>تایید و برش تصویر در کادر</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
