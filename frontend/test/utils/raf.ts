import { act } from '@testing-library/react';
import { vi } from 'vitest';

// Deterministic requestAnimationFrame: frames only run when a test calls
// `frame()` / `run()`, with a clock the test controls.
export function installRafMock() {
  let now = 0;
  let nextId = 0;
  const queue = new Map<number, FrameRequestCallback>();

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    nextId += 1;
    queue.set(nextId, cb);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    queue.delete(id);
  });

  const frame = (ms = 0) => {
    now += ms;
    const callbacks = [...queue.values()];
    queue.clear();
    act(() => callbacks.forEach((cb) => cb(now)));
  };

  return {
    frame,
    /** Advance `totalMs` in frames of `stepMs`. */
    run(totalMs: number, stepMs = 100) {
      for (let t = 0; t < totalMs; t += stepMs) frame(Math.min(stepMs, totalMs - t));
    },
    /** Advance the clock without running frames (browser tab in background). */
    skip(ms: number) {
      now += ms;
    },
  };
}
