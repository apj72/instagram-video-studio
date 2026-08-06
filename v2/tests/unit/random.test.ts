import { describe, it, expect } from 'vitest';
import { createRNG, frameRNG } from '../../src/core/random.ts';

describe('seeded PRNG', () => {
  it('produces deterministic output for same seed', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(42);
    const vals1 = Array.from({ length: 100 }, () => rng1.next());
    const vals2 = Array.from({ length: 100 }, () => rng2.next());
    expect(vals1).toEqual(vals2);
  });

  it('produces different output for different seeds', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(99);
    const vals1 = Array.from({ length: 10 }, () => rng1.next());
    const vals2 = Array.from({ length: 10 }, () => rng2.next());
    expect(vals1).not.toEqual(vals2);
  });

  it('output is in [0, 1)', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextRange returns values in range', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextRange(10, 20);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThan(20);
    }
  });

  it('nextInt returns integers in range', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(0, 10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('fork produces different sequences', () => {
    const rng = createRNG(42);
    const forked = rng.fork(100);
    const vals1 = Array.from({ length: 10 }, () => rng.next());
    const vals2 = Array.from({ length: 10 }, () => forked.next());
    expect(vals1).not.toEqual(vals2);
  });

  it('frameRNG is deterministic for same seed+frame', () => {
    const rng1 = frameRNG(42, 10);
    const rng2 = frameRNG(42, 10);
    expect(rng1.next()).toBe(rng2.next());
  });

  it('frameRNG differs across frames', () => {
    const rng1 = frameRNG(42, 10);
    const rng2 = frameRNG(42, 11);
    const v1 = Array.from({ length: 5 }, () => rng1.next());
    const v2 = Array.from({ length: 5 }, () => rng2.next());
    expect(v1).not.toEqual(v2);
  });

  it('has reasonable distribution', () => {
    const rng = createRNG(42);
    let below = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      if (rng.next() < 0.5) below++;
    }
    expect(below / n).toBeGreaterThan(0.45);
    expect(below / n).toBeLessThan(0.55);
  });
});
