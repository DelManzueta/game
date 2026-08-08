/**
 * HQ seat model — bible §2.1.
 * Founder is seat 0, never an employee energy subject.
 */
import type { HqSeat, StudioTierId } from "./types";
import { officeDef } from "./offices";

export function buildHqSeats(tier: StudioTierId, founderId = "founder"): HqSeat[] {
  const def = officeDef(tier);
  const seats: HqSeat[] = [];
  for (let i = 0; i < def.hqSeatsTotal; i++) {
    if (i === 0) {
      seats.push({
        index: 0,
        kind: "founder",
        occupantId: founderId,
        roleLocked: true,
      });
      continue;
    }
    // Tier 5: last two seats are directors
    if (tier === 5 && i === def.hqSeatsTotal - 2) {
      seats.push({
        index: i,
        kind: "rnd_director",
        occupantId: null,
        roleLocked: true,
      });
      continue;
    }
    if (tier === 5 && i === def.hqSeatsTotal - 1) {
      seats.push({
        index: i,
        kind: "hardware_director",
        occupantId: null,
        roleLocked: true,
      });
      continue;
    }
    seats.push({
      index: i,
      kind: "production",
      occupantId: null,
      roleLocked: false,
    });
  }
  return seats;
}

export function filledProductionSeats(seats: HqSeat[]): number {
  return seats.filter((s) => s.kind === "production" && s.occupantId).length;
}

export function openProductionSeats(seats: HqSeat[]): number {
  return seats.filter((s) => s.kind === "production" && !s.occupantId).length;
}

/** Max hired production employees (excludes founder and directors). */
export function maxProductionHires(tier: StudioTierId): number {
  const def = officeDef(tier);
  if (tier === 5) return 5; // founder + 5 production + 2 directors
  return Math.max(0, def.hqSeatsTotal - 1);
}
