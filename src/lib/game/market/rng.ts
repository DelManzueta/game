import { SeededRng, hashSeed } from "../scoring/rng";

export function marketRng(
  campaignSeed: number,
  stream: string,
  counter: number,
  ...extra: Array<string | number>
): SeededRng {
  return new SeededRng(hashSeed(campaignSeed, stream, counter, ...extra));
}

export function seededPick<T>(rng: SeededRng, arr: T[]): T {
  return arr[rng.int(0, arr.length - 1)]!;
}
