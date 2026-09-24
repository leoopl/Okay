'use client';

import { useState, useEffect, useRef } from 'react';

// PALETTE: edit --breathing-* tokens in app/globals.css @theme block to recolor.

export type BreathingDurations = readonly [number, number, number, number];
export type PhaseIndex = 0 | 1 | 2 | 3;

export interface BreathingFrameData {
  delta: number;
  phase: PhaseIndex;
  progress: number;
  reducedMotion: boolean;
  isPrepPhase: boolean;
}

const PHASE_LABELS = ['Inspire', 'Segure', 'Expire', 'Espere'] as const;

interface UseBreathingAnimationInput {
  breathingTime: BreathingDurations;
  isAnimating: boolean;
  countdownStart?: number;
  onFrame?: (frame: BreathingFrameData) => void;
}

interface BreathingAnimationState {
  guideMessage: string;
  phase: PhaseIndex;
  secondsLeft: number;
  reducedMotion: boolean;
  isPrepPhase: boolean;
}

export function useBreathingAnimation({
  breathingTime,
  isAnimating,
  countdownStart = 4,
  onFrame,
}: UseBreathingAnimationInput): BreathingAnimationState {
  const [guideMessage, setGuideMessage] = useState<string>('Prepare-se... 😃');
  const [phase, setPhase] = useState<PhaseIndex>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(countdownStart);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  const [isPrepPhase, setIsPrepPhase] = useState<boolean>(true);

  // Mutable input refs — synced via cheap effects; never in the rAF effect's dep list.
  const breathingTimeRef = useRef<BreathingDurations>(breathingTime);
  const isAnimatingRef = useRef(isAnimating);
  const countdownStartRef = useRef(countdownStart);
  const reducedMotionRef = useRef(false);
  const onFrameRef = useRef(onFrame);

  useEffect(() => { breathingTimeRef.current = breathingTime; }, [breathingTime]);
  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { countdownStartRef.current = countdownStart; }, [countdownStart]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);
  useEffect(() => { onFrameRef.current = onFrame; }, [onFrame]);

  // prefers-reduced-motion — change listener only (initial value set in useState above).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Single rAF loop — mounts once, runs for the full component lifetime.
  useEffect(() => {
    let rafId: number | null = null;
    let lastFrame: number | null = null;
    let elapsed = 0;
    let inPrep = true;
    let currentPhase: PhaseIndex = 0;
    let prevSeconds = -1;

    const advance = (durations: BreathingDurations, from: PhaseIndex): PhaseIndex => {
      let next = ((from + 1) % 4) as PhaseIndex;
      let guard = 0;
      while (durations[next] === 0 && guard < 4) {
        next = ((next + 1) % 4) as PhaseIndex;
        guard++;
      }
      return next;
    };

    const firstNonZero = (durations: BreathingDurations): PhaseIndex => {
      let p: PhaseIndex = 0;
      let guard = 0;
      while (durations[p] === 0 && guard < 4) {
        p = ((p + 1) % 4) as PhaseIndex;
        guard++;
      }
      return p;
    };

    const tick = (now: number) => {
      const delta = lastFrame === null ? 0 : now - lastFrame;
      lastFrame = now;

      if (isAnimatingRef.current) {
        elapsed += delta;
      }

      const durations = breathingTimeRef.current;
      const cstart = countdownStartRef.current;
      const reduced = reducedMotionRef.current;

      if (inPrep) {
        const prepMs = cstart * 1000;
        const remaining = Math.max(1, Math.ceil((prepMs - elapsed) / 1000));
        if (remaining !== prevSeconds) {
          prevSeconds = remaining;
          setSecondsLeft(remaining);
        }

        onFrameRef.current?.({ delta, phase: currentPhase, progress: 0, reducedMotion: reduced, isPrepPhase: true });

        if (elapsed >= prepMs && isAnimatingRef.current) {
          inPrep = false;
          elapsed = 0;
          currentPhase = firstNonZero(durations);
          prevSeconds = durations[currentPhase];
          setIsPrepPhase(false);
          setPhase(currentPhase);
          setGuideMessage(PHASE_LABELS[currentPhase]);
          setSecondsLeft(durations[currentPhase]);
        }
      } else {
        const phaseDurationMs = durations[currentPhase] * 1000;
        const progress = phaseDurationMs > 0 ? Math.min(elapsed / phaseDurationMs, 1) : 1;
        const remaining = Math.max(1, Math.ceil((phaseDurationMs - elapsed) / 1000));

        if (remaining !== prevSeconds) {
          prevSeconds = remaining;
          setSecondsLeft(remaining);
        }

        onFrameRef.current?.({ delta, phase: currentPhase, progress, reducedMotion: reduced, isPrepPhase: false });

        if (elapsed >= phaseDurationMs && isAnimatingRef.current) {
          elapsed = 0;
          const next = advance(durations, currentPhase);
          currentPhase = next;
          prevSeconds = durations[next];
          setPhase(next);
          setGuideMessage(PHASE_LABELS[next]);
          setSecondsLeft(durations[next]);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      lastFrame = null;
    };
  }, []); // Intentional empty deps — all inputs read via refs above.

  return { guideMessage, phase, secondsLeft, reducedMotion, isPrepPhase };
}
