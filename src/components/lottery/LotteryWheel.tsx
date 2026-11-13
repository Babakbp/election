import React, { useEffect, useRef, useState } from 'react';
import { LotteryParticipant } from '../../types/lottery';
import { toPersianDigits } from '../../utils/persian';
import { audioFeedback } from '../../utils/audioFeedback';

interface LotteryWheelProps {
  participants: LotteryParticipant[];
  isSpinning: boolean;
  durationSeconds: number;
  enableSound: boolean;
  firstWinner?: LotteryParticipant | null;
  onSpinComplete?: () => void;
}

const WHEEL_COLORS = [
  '#0f766e', // teal-700
  '#1e293b', // slate-800
  '#b45309', // amber-700
  '#1d4ed8', // blue-700
  '#047857', // emerald-700
  '#334155', // slate-700
  '#c2410c', // orange-700
  '#4338ca', // indigo-700
];

export const LotteryWheel: React.FC<LotteryWheelProps> = ({
  participants,
  isSpinning,
  durationSeconds,
  enableSound,
  firstWinner,
  onSpinComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(durationSeconds);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [spotlightParticipant, setSpotlightParticipant] = useState<LotteryParticipant | null>(
    participants[0] || null
  );

  // Build visible slices (between 8 and 16 slices for visual legibility)
  const visibleSlices = React.useMemo(() => {
    if (participants.length === 0) {
      return Array.from({ length: 12 }).map((_, i) => ({
        id: `empty-${i}`,
        label: `جایگاه ${toPersianDigits(i + 1)}`,
        code: '--------',
      }));
    }

    const maxSlices = Math.min(16, Math.max(8, participants.length));
    const list: Array<{ id: string; label: string; code: string }> = [];

    // Ensure firstWinner is included in slice 0 if known
    if (firstWinner) {
      list.push({
        id: firstWinner.id,
        label: firstWinner.fullName,
        code: firstWinner.identifierCode,
      });
    }

    for (let i = 0; i < participants.length && list.length < maxSlices; i++) {
      const p = participants[i];
      if (!firstWinner || p.id !== firstWinner.id) {
        list.push({
          id: p.id,
          label: p.fullName,
          code: p.identifierCode,
        });
      }
    }

    // Pad up to 8 slices if fewer than 8 participants
    let padIdx = 0;
    while (list.length < 8 && participants.length > 0) {
      const p = participants[padIdx % participants.length];
      list.push({
        id: `${p.id}-pad-${list.length}`,
        label: p.fullName,
        code: p.identifierCode,
      });
      padIdx++;
    }

    return list;
  }, [participants, firstWinner]);

  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastSegmentRef = useRef<number>(-1);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  // Draw wheel at a given angle (radians) and optional bulb phase
  const drawWheel = (angleRad: number, bulbTick: number, pointerBounce: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalSize = 440;
    if (canvas.width !== logicalSize * dpr || canvas.height !== logicalSize * dpr) {
      canvas.width = logicalSize * dpr;
      canvas.height = logicalSize * dpr;
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalSize, logicalSize);

    const cx = logicalSize / 2;
    const cy = logicalSize / 2 + 10;
    const outerRadius = 192;
    const innerRimRadius = 176;
    const slicesCount = visibleSlices.length;
    const sliceAngle = (2 * Math.PI) / slicesCount;

    // Outer shadow ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Metallic outer bezel
    const rimGrad = ctx.createRadialGradient(cx, cy, innerRimRadius, cx, cy, outerRadius);
    rimGrad.addColorStop(0, '#334155');
    rimGrad.addColorStop(0.6, '#1e293b');
    rimGrad.addColorStop(1, '#0f172a');
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    // Draw segments
    for (let i = 0; i < slicesCount; i++) {
      const startAngle = angleRad + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerRimRadius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();

      // Label along wedge
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const slice = visibleSlices[i];
      const shortName =
        slice.label.length > 16 ? slice.label.slice(0, 15) + '…' : slice.label;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Vazirmatn, Tahoma, sans-serif';
      ctx.fillText(shortName, innerRimRadius - 14, -5);

      ctx.fillStyle = '#fde68a';
      ctx.font = '600 9.5px monospace';
      ctx.fillText(toPersianDigits(slice.code), innerRimRadius - 14, 8);
      ctx.restore();
    }

    // Chasing rim lights & peg pins on segment boundaries
    const lightsCount = slicesCount * 2;
    for (let i = 0; i < lightsCount; i++) {
      const lightAngle = angleRad + i * ((2 * Math.PI) / lightsCount);
      const lx = cx + Math.cos(lightAngle) * (outerRadius - 8);
      const ly = cy + Math.sin(lightAngle) * (outerRadius - 8);
      const isLit = isSpinning ? (i + bulbTick) % 2 === 0 : i % 2 === 0;

      ctx.beginPath();
      ctx.arc(lx, ly, isLit ? 4 : 3, 0, 2 * Math.PI);
      ctx.fillStyle = isLit ? '#fbbf24' : '#475569';
      ctx.fill();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(cx - 5, cy - 5, 3, cx, cy, 24);
    hubGrad.addColorStop(0, '#fcd34d');
    hubGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = hubGrad;
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 10px Vazirmatn, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('قرعه‌کشی', cx, cy);

    // Top Pointer Clapper (at 12 o'clock: -PI/2)
    ctx.save();
    ctx.translate(cx, cy - outerRadius + 4);
    ctx.rotate(pointerBounce);
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(-13, -12);
    ctx.lineTo(13, -12);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fef2f2';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fde68a';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  // Initial static draw when not spinning
  useEffect(() => {
    if (!isSpinning) {
      setRemainingSeconds(durationSeconds);
      setProgressPercent(0);
      drawWheel(rotationRef.current, 0, 0);
    }
  }, [visibleSlices, isSpinning, durationSeconds]);

  // Animated spin loop for exact durationSeconds
  useEffect(() => {
    if (!isSpinning) return;

    const totalMs = Math.max(1000, durationSeconds * 1000);
    const startTime = performance.now();
    const startAngle = rotationRef.current;

    // Land precisely on slice 0 (where firstWinner sits) at top pointer (-PI/2)
    const slicesCount = visibleSlices.length;
    const sliceAngle = (2 * Math.PI) / slicesCount;
    const targetSliceCenter = -Math.PI / 2 - sliceAngle / 2;
    const totalSpins = Math.max(12, Math.round(durationSeconds * 0.9));
    // Normalize target so it always rotates forward smoothly
    const baseDelta = totalSpins * 2 * Math.PI;
    const normalizedCurrent = ((startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const normalizedTarget = ((targetSliceCenter % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const correction = (normalizedTarget - normalizedCurrent + 2 * Math.PI) % (2 * Math.PI);
    const endAngle = startAngle + baseDelta + correction;

    let lastSpotlightUpdate = 0;
    let pointerBounce = 0;

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / totalMs);
      const eased = easeOutQuart(t);

      const currentAngle = startAngle + (endAngle - startAngle) * eased;
      rotationRef.current = currentAngle;

      // Detect segment crossing at top pointer for clapper bounce & tick sound
      const normalized =
        (((currentAngle + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSeg = Math.floor(normalized / sliceAngle);
      if (currentSeg !== lastSegmentRef.current) {
        lastSegmentRef.current = currentSeg;
        pointerBounce = -0.26;
        if (enableSound && t < 0.985) {
          audioFeedback.playWheelTick();
        }
      } else {
        pointerBounce *= 0.82;
      }

      // Cycle spotlight participant rapidly then slow down
      const spotlightInterval = 50 + t * 220;
      if (participants.length > 0 && now - lastSpotlightUpdate > spotlightInterval) {
        lastSpotlightUpdate = now;
        if (t > 0.96 && firstWinner) {
          setSpotlightParticipant(firstWinner);
        } else {
          const idx = Math.floor(Math.random() * participants.length);
          setSpotlightParticipant(participants[idx]);
        }
      }

      const bulbTick = Math.floor(elapsed / 180);
      drawWheel(currentAngle, bulbTick, pointerBounce);

      const rem = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setRemainingSeconds(rem);
      setProgressPercent(Math.round(t * 100));

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setRemainingSeconds(0);
        setProgressPercent(100);
        if (firstWinner) setSpotlightParticipant(firstWinner);
        if (enableSound) {
          audioFeedback.playLotteryFanfare();
        }
        onSpinCompleteRef.current?.();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, durationSeconds, enableSound, visibleSlices, participants, firstWinner]);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* Wheel Stage */}
      <div className="relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-[310px] h-[310px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] block"
          aria-label="چرخ گردون متحرک قرعه‌کشی"
        />
      </div>

      {/* Live Countdown & Progress during Spin */}
      <div className="w-full max-w-md mt-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold">
            {isSpinning
              ? 'چرخ قرعه‌کشی در حال چرخش و انتخاب تصادفی است...'
              : 'آماده اجرای قرعه‌کشی با چرخش چرخ گردون'}
          </span>
          <span className="font-mono tabular-nums font-bold text-amber-400">
            {toPersianDigits(remainingSeconds)} ثانیه
          </span>
        </div>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
          <div
            className="h-full bg-amber-500 transition-all duration-150"
            style={{ width: `${isSpinning ? progressPercent : 0}%` }}
          />
        </div>

        {/* Live Ticker Spotlight */}
        {spotlightParticipant && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block">
                {isSpinning ? 'بررسی در لحظه:' : 'نمونه شرکت‌کننده در چرخ:'}
              </span>
              <strong className="text-sm font-bold text-white truncate block">
                {spotlightParticipant.fullName}
              </strong>
            </div>
            <div className="text-left flex-shrink-0">
              <span className="text-[10px] text-slate-400 block">
                {spotlightParticipant.identifierType === 'PERSONNEL_8'
                  ? 'کد پرسنلی ۸ رقمی'
                  : 'کد ملی ۱۰ رقمی'}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold text-amber-300">
                {toPersianDigits(spotlightParticipant.identifierCode)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
