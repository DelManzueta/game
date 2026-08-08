/**
 * Product photography for platforms (Vena hardware line + SAGA tier art).
 * Paths under /art/platforms/
 */

const BASE = "/art/platforms";

/** Full product shot (hero / detail). */
export const PLATFORM_ART: Record<string, string> = {
  // Vena first-party hardware
  vena_oasis: `${BASE}/vena-genesis-x.jpg`, // early living-room form language
  vena_gear: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_genesis_x: `${BASE}/vena-genesis-x.jpg`,
  vena_nova: `${BASE}/vena-nova.jpg`,
  vena_edge: `${BASE}/vena-edge.jpg`,
  vena_echo: `${BASE}/vena-echo.jpg`,
  // Helix SAGA three-tier (uses Vena industrial design language)
  saga_nova: `${BASE}/vena-nova.jpg`,
  saga_blitz: `${BASE}/vena-edge.jpg`,
  saga_apex: `${BASE}/vena-echo.jpg`,
  // Brand / next-gen teaser
  vena_cosmos: `${BASE}/vena-cosmos.jpg`,
  dreamvast: `${BASE}/vena-nova.jpg`,
};

export const PLATFORM_THUMB: Record<string, string> = {
  vena_genesis_x: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_nova: `${BASE}/vena-nova-thumb.jpg`,
  vena_edge: `${BASE}/vena-edge-thumb.jpg`,
  vena_echo: `${BASE}/vena-echo-thumb.jpg`,
  saga_nova: `${BASE}/vena-nova-thumb.jpg`,
  saga_blitz: `${BASE}/vena-edge-thumb.jpg`,
  saga_apex: `${BASE}/vena-echo-thumb.jpg`,
  vena_oasis: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_gear: `${BASE}/vena-genesis-x-thumb.jpg`,
  dreamvast: `${BASE}/vena-nova-thumb.jpg`,
};

export const VENA_BRAND_ART = `${BASE}/vena-cosmos.jpg`;

export function platformArt(id: string): string | undefined {
  return PLATFORM_ART[id];
}

export function platformThumb(id: string): string | undefined {
  return PLATFORM_THUMB[id] ?? PLATFORM_ART[id];
}
