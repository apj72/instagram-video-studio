export interface SeededRNG {
  next(): number;
  nextRange(min: number, max: number): number;
  nextInt(min: number, max: number): number;
  fork(seed: number): SeededRNG;
}

export function createRNG(seed: number): SeededRNG {
  let state = seed | 0;

  function mulberry32(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next: mulberry32,
    nextRange(min: number, max: number): number {
      return min + mulberry32() * (max - min);
    },
    nextInt(min: number, max: number): number {
      return Math.floor(min + mulberry32() * (max - min));
    },
    fork(childSeed: number): SeededRNG {
      return createRNG(state ^ childSeed);
    },
  };
}

export function frameRNG(baseSeed: number, frameNumber: number): SeededRNG {
  return createRNG(baseSeed ^ (frameNumber * 2654435761));
}
