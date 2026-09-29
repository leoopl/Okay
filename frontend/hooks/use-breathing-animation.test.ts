import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setVisibility } from '@/test/utils/media';
import { installRafMock } from '@/test/utils/raf';
import {
  useBreathingAnimation,
  type BreathingDurations,
  type BreathingFrameData,
} from './use-breathing-animation';

let raf: ReturnType<typeof installRafMock>;

beforeEach(() => {
  raf = installRafMock();
});

function setup(breathingTime: BreathingDurations, countdownStart = 4) {
  const frames: BreathingFrameData[] = [];
  const onFrame = vi.fn((f: BreathingFrameData) => frames.push(f));
  const hook = renderHook(() =>
    useBreathingAnimation({ breathingTime, countdownStart, onFrame }),
  );
  raf.frame(0); // first frame only records the start timestamp
  return { ...hook, frames, lastFrame: () => frames[frames.length - 1] };
}

describe('useBreathingAnimation', () => {
  it('starts in the prep countdown', () => {
    const { result } = setup([4, 4, 4, 4]);
    expect(result.current.isPrepPhase).toBe(true);
    expect(result.current.secondsLeft).toBe(4);
  });

  it('counts the prep down once per second', () => {
    const { result } = setup([4, 4, 4, 4]);
    raf.run(1500);
    expect(result.current.secondsLeft).toBe(3);
  });

  it('enters Inspire with its full duration after the prep countdown', () => {
    const { result } = setup([5, 4, 4, 4]);
    raf.run(4000);
    expect(result.current.isPrepPhase).toBe(false);
    expect(result.current.phase).toBe(0);
    expect(result.current.secondsLeft).toBe(5);
  });

  it('cycles through the four phases in order', () => {
    const { result } = setup([1, 1, 1, 1], 1);
    raf.run(1000);
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(result.current.phase);
      raf.run(1000);
    }
    expect(seen).toEqual([0, 1, 2, 3, 0]);
  });

  it('skips phases whose duration is zero', () => {
    const { result } = setup([1, 0, 1, 0], 1);
    raf.run(1000);
    const seen: number[] = [];
    for (let i = 0; i < 3; i++) {
      seen.push(result.current.phase);
      raf.run(1000);
    }
    expect(seen).toEqual([0, 2, 0]);
  });

  it('carries frame overshoot into the next phase so the rhythm does not drift', () => {
    const { lastFrame } = setup([1, 1, 1, 1], 1);
    raf.run(1000);
    raf.frame(1400); // overshoots Inspire by 400 ms
    raf.frame(100);
    expect(lastFrame().phase).toBe(1);
    expect(lastFrame().progress).toBeCloseTo(0.5);
  });

  it('pauses while the tab is hidden and resumes where it left off', () => {
    const { result, lastFrame } = setup([4, 4, 4, 4], 1);
    raf.run(1000);
    raf.run(1000);
    setVisibility('hidden');
    raf.skip(30_000); // browsers stop running frames in background tabs
    setVisibility('visible');
    raf.frame(0);
    raf.frame(100);
    expect(result.current.phase).toBe(0);
    expect(lastFrame().progress).toBeCloseTo(1100 / 4000);
  });

  it('reports eased progress through the current phase', () => {
    const { lastFrame } = setup([2, 2, 2, 2], 1);
    raf.run(1000);
    raf.run(500);
    expect(lastFrame().phase).toBe(0);
    expect(lastFrame().progress).toBeCloseTo(0.25);
  });
});
