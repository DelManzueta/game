/**
 * Product photography for platforms.
 * Owner product shots are embedded as data URLs (see platformArtSeed / one/).
 * Vena first-party hardware still uses /art/platforms/ files.
 */
import { platformDataUrl } from "./platformArtSeed";

const BASE = "/art/platforms";

const SEEDED = [
  "tes_64",
  "dreamvast",
  "playsystem_2",
  "playsystem_2_slim",
  "mbox",
  "game_sphere",
  "gs",
  "3gs",
  "pps",
  "nuu",
  "2gs",
  "mbox_360",
  "mpad",
  "oya",
  "mbox_one",
  "playsystem_4",
] as const;

function seededArt(id: string): string | undefined {
  return platformDataUrl(id, "full");
}

function seededThumb(id: string): string | undefined {
  return platformDataUrl(id, "thumb") ?? platformDataUrl(id, "full");
}

/** Full product shot (hero / detail / news card). */
export const PLATFORM_ART: Record<string, string> = {
  // Seeded owner product shots (data URLs resolved at runtime via platformArt())
  // Vena first-party hardware
  vena_oasis: `${BASE}/vena-genesis-x.jpg`,
  vena_gear: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_genesis_x: `${BASE}/vena-genesis-x.jpg`,
  vena_nova: `${BASE}/vena-nova.jpg`,
  vena_edge: `${BASE}/vena-edge.jpg`,
  vena_echo: `${BASE}/vena-echo.jpg`,
  vena_cosmos: `${BASE}/vena-cosmos.jpg`,
  saga_nova: `${BASE}/vena-nova.jpg`,
  saga_blitz: `${BASE}/vena-edge.jpg`,
  saga_apex: `${BASE}/vena-echo.jpg`,
};

// Register seeded platforms into PLATFORM_ART
for (const id of SEEDED) {
  const url = seededArt(id);
  if (url) PLATFORM_ART[id] = url;
}

export const PLATFORM_THUMB: Record<string, string> = {
  vena_genesis_x: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_nova: `${BASE}/vena-nova-thumb.jpg`,
  vena_edge: `${BASE}/vena-edge-thumb.jpg`,
  vena_echo: `${BASE}/vena-echo-thumb.jpg`,
  vena_oasis: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_gear: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_cosmos: `${BASE}/vena-cosmos-thumb.jpg`,
  saga_nova: `${BASE}/vena-nova-thumb.jpg`,
  saga_blitz: `${BASE}/vena-edge-thumb.jpg`,
  saga_apex: `${BASE}/vena-echo-thumb.jpg`,
};

for (const id of SEEDED) {
  const url = seededThumb(id);
  if (url) PLATFORM_THUMB[id] = url;
}

export const VENA_BRAND_ART = `${BASE}/vena-cosmos.jpg`;

export function platformArt(id: string): string | undefined {
  return PLATFORM_ART[id] ?? seededArt(id);
}

export function platformThumb(id: string): string | undefined {
  return PLATFORM_THUMB[id] ?? PLATFORM_ART[id] ?? seededThumb(id);
}
