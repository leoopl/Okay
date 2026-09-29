'use client';

// PALETTE: edit --breathing-* tokens in app/globals.css @theme block to recolor.

import { useRef, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useBreathingAnimation,
  type BreathingDurations,
  type PhaseIndex,
  type BreathingFrameData,
} from '@/hooks/use-breathing-animation';
import { useWakeLock } from '@/hooks/use-wake-lock';

// ─── SVG geometry (viewBox 400 × 400, all radii in viewBox units) ──────────
const VB = 400;
const CX = VB / 2;
const CY = VB / 2;
const R_OUTER = 184; // static outer ring
const R_MAX = 184; // inner shape at full Inspire (meets outer)
const R_MIN = 64; // inner shape at full Expire / rest

// ─── Wave parameters (from Handoff: Breathing Animation v2 Wave) ────────────
const WAVE_SEGMENTS = 120;
const WAVE_AMP = 10; // peak amplitude in viewBox units
const WAVE_FREQ_A = 4; // must be integer for seamless path closure
const WAVE_FREQ_B = 6; // must be integer for seamless path closure
const WAVE_SPEED_A = -1.1; // rad/s, negative = clockwise travel
const WAVE_SPEED_B = 1; // rad/s, positive = counter-clockwise travel

// ─── Reduced-motion opacity bounds ──────────────────────────────────────────
const OPACITY_MIN = 0.25;
const OPACITY_MAX = 0.7;

// ─── Phase copy (pt-BR) ─────────────────────────────────────────────────────
const PHASE_LABELS = ['Inspire', 'Segure', 'Expire', 'Espere'] as const;
const PREP_MESSAGE = 'Prepare-se... 😃';

const PHASE_ARIA: Record<PhaseIndex, string> = {
  0: 'Inspire profundamente',
  1: 'Segure a respiração',
  2: 'Expire devagar',
  3: 'Espere',
};

// ─── Easing ─────────────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Wave path generator ────────────────────────────────────────────────────
// Two integer-frequency sine waves travel at independent speeds; their
// combination never repeats the same pattern, reading as organic rather than
// mechanical. Frequencies are Math.round'd so the path closes at 2π.
function generateWavePath(
  radius: number,
  amplitude: number,
  freqA: number,
  freqB: number,
  shiftA: number,
  shiftB: number,
): string {
  const fA = Math.round(freqA);
  const fB = Math.round(freqB);
  let d = '';
  for (let i = 0; i <= WAVE_SEGMENTS; i++) {
    const a = (i / WAVE_SEGMENTS) * Math.PI * 2;
    const wave = Math.sin(a * fA + shiftA) + 0.6 * Math.sin(a * fB + shiftB);
    const r = radius + wave * amplitude;
    const x = CX + Math.cos(a) * r;
    const y = CY + Math.sin(a) * r;
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : ` L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + ' Z';
}

// Pre-computed static paths for first paint and reduced-motion holds.
const STATIC_MIN_PATH = generateWavePath(R_MIN, 0, WAVE_FREQ_A, WAVE_FREQ_B, 0, 0);
const STATIC_MAX_PATH = generateWavePath(R_MAX, 0, WAVE_FREQ_A, WAVE_FREQ_B, 0, 0);

// ─── Props ───────────────────────────────────────────────────────────────────
interface BreathingAnimationProps {
  /** Technique name — the dialog's accessible name. */
  title: string;
  onClose: () => void;
  breathingTime: BreathingDurations;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BreathingAnimation({
  title,
  onClose,
  breathingTime,
  className,
}: BreathingAnimationProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const shiftARef = useRef(0);
  const shiftBRef = useRef(0);

  // Per-frame imperative path mutation — no React re-render.
  const onFrame = useCallback((frame: BreathingFrameData) => {
    const pathEl = pathRef.current;
    if (!pathEl || frame.isPrepPhase) return;

    const { delta, phase, progress, reducedMotion } = frame;

    if (reducedMotion) {
      pathEl.setAttribute('d', STATIC_MAX_PATH);
      let opacity = OPACITY_MAX;
      if (phase === 0) {
        opacity = OPACITY_MIN + (OPACITY_MAX - OPACITY_MIN) * easeInOut(progress);
      } else if (phase === 2) {
        opacity = OPACITY_MAX - (OPACITY_MAX - OPACITY_MIN) * easeInOut(progress);
      } else if (phase === 3) {
        opacity = OPACITY_MIN; // Espere holds where Expire ended
      }
      pathEl.style.opacity = opacity.toFixed(3);
      return;
    }

    shiftARef.current += (delta / 1000) * WAVE_SPEED_A;
    shiftBRef.current += (delta / 1000) * WAVE_SPEED_B;

    let radius = R_MIN;
    let envelope = 0;
    if (phase === 0) {
      radius = R_MIN + (R_MAX - R_MIN) * easeInOut(progress);
      envelope = Math.sin(progress * Math.PI); // 0 → peak → 0 across phase
    } else if (phase === 1) {
      radius = R_MAX;
    } else if (phase === 2) {
      radius = R_MAX - (R_MAX - R_MIN) * easeInOut(progress);
      envelope = Math.sin(progress * Math.PI);
    }
    // phase === 3 (Espere): radius = R_MIN, envelope = 0

    pathEl.setAttribute(
      'd',
      generateWavePath(
        radius,
        WAVE_AMP * envelope,
        WAVE_FREQ_A,
        WAVE_FREQ_B,
        shiftARef.current,
        shiftBRef.current,
      ),
    );
    if (pathEl.style.opacity) pathEl.style.opacity = '';
  }, []);

  const { phase, secondsLeft, isPrepPhase } = useBreathingAnimation({ breathingTime, onFrame });
  useWakeLock();

  // Radix supplies the modal behaviour: focus trap, Escape, hiding the page from
  // assistive tech, and — through Overlay — the scroll lock.
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-breathing-overlay fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'bg-breathing-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6',
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          {/* Screen-reader phase announcer — polite, never interrupts. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="font-varela sr-only">
            {isPrepPhase ? 'Prepare-se' : PHASE_ARIA[phase]}
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-breathing-label hover:text-breathing-label absolute top-4 right-4 hover:bg-white/10"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-6" aria-hidden="true" />
          </Button>

          {/* Phase label — outside, above the circle */}
          <h2
            className={cn(
              'text-breathing-label font-varela select-none',
              isPrepPhase
                ? 'text-xl font-light'
                : 'text-3xl font-light tracking-[0.18em] uppercase',
            )}
            aria-hidden="true"
          >
            {isPrepPhase ? PREP_MESSAGE : PHASE_LABELS[phase]}
          </h2>

          {/* Breathing stage */}
          <div className="relative aspect-square w-[min(82vw,400px)]">
            <svg
              viewBox={`0 0 ${VB} ${VB}`}
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="ba-inner-grad" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="var(--color-breathing-fill)" stopOpacity="0.9" />
                  <stop
                    offset="100%"
                    stopColor="var(--color-breathing-stroke)"
                    stopOpacity="0.85"
                  />
                </radialGradient>
              </defs>

              {/* Outer ring — perfectly static at all times */}
              <circle
                cx={CX}
                cy={CY}
                r={R_OUTER}
                fill="var(--color-breathing-ring)"
                fillOpacity={0.2}
              />
              <circle
                cx={CX}
                cy={CY}
                r={R_OUTER}
                fill="none"
                stroke="var(--color-breathing-stroke)"
                strokeWidth={1.5}
                strokeOpacity={0.45}
              />

              {/* Inner animated shape — d attribute driven by rAF callback above */}
              <path
                ref={pathRef}
                d={STATIC_MIN_PATH}
                fill="url(#ba-inner-grad)"
                fillOpacity={0.7}
              />
            </svg>

            {/* Countdown — centered inside the inner circle */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-breathing-count font-varela text-5xl font-extralight tabular-nums">
                {secondsLeft}
              </span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
