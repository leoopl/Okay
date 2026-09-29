import { describe, expect, it } from 'vitest';
import { breathingTechniques } from './breathing-techniques';

describe('breathingTechniques', () => {
  it('has unique ids', () => {
    const ids = breathingTechniques.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(breathingTechniques)('$name has four non-negative phase durations', ({ secs }) => {
    expect(secs).toHaveLength(4);
    secs.forEach((s) => expect(s).toBeGreaterThanOrEqual(0));
  });

  it.each(breathingTechniques)('$name breathes in and out', ({ secs }) => {
    expect(secs[0]).toBeGreaterThan(0);
    expect(secs[2]).toBeGreaterThan(0);
  });

  it.each(breathingTechniques)('$name uses a breathing card color', ({ tone }) => {
    expect(['earth', 'sky', 'sage', 'lavender', 'mint', 'sand']).toContain(tone);
  });

  it('gives every card its own color', () => {
    const tones = breathingTechniques.map((t) => t.tone);
    expect(new Set(tones).size).toBe(tones.length);
  });

  it.each(breathingTechniques)('$name has a card purpose line of up to 60 characters', ({ purpose }) => {
    expect(purpose.trim()).not.toBe('');
    expect(purpose.length).toBeLessThanOrEqual(60);
  });

  it.each(breathingTechniques)('$name cites at least one reference with a link', ({ references }) => {
    expect(references.length).toBeGreaterThan(0);
    for (const ref of references) {
      expect(ref.citation.trim()).not.toBe('');
      expect(ref.url).toMatch(/^https:\/\//);
    }
  });

  it.each(breathingTechniques)('$name paces slow breathing (10 breaths/min or fewer)', ({ secs }) => {
    const cycle = secs.reduce((a, b) => a + b, 0);
    expect(60 / cycle).toBeLessThanOrEqual(10);
  });
});
