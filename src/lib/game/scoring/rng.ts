/**
 * Deterministic seeded RNG (Mulberry32).
 * All scoring randomness must go through this for testability.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force uint32-ish seed
    this.state = seed >>> 0 || 1;
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Symmetric jitter around 0. */
  jitter(amount: number): number {
    return this.range(-amount, amount);
  }
}

/** Stable hash of a string → uint32 seed. */
export function hashSeed(...parts: Array<string | number | boolean | null | undefined>): number {
  const s = parts.map((p) => String(p ?? "")).join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
