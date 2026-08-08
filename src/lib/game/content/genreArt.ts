/**
 * Genre icons — sliced from the owner's teal glass tile sheet (IMG_0942).
 * Order on sheet L→R: strategy, simulation, casual, action, adventure, rpg.
 */
import type { GenreId } from "../types";

const BASE = "/art/ui/genres";

export const GENRE_ICON: Record<GenreId, string> = {
  strategy: `${BASE}/strategy.png`,
  simulation: `${BASE}/simulation.png`,
  casual: `${BASE}/casual.png`,
  action: `${BASE}/action.png`,
  adventure: `${BASE}/adventure.png`,
  rpg: `${BASE}/rpg.png`,
};

export function genreIconSrc(id: GenreId): string {
  return GENRE_ICON[id];
}
