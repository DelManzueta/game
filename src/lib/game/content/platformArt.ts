/**
 * Product photography for platforms.
 * Paths under /art/platforms/
 * Owner product shots (IMG_0829–IMG_0845) mapped by catalog id.
 */

const BASE = "/art/platforms";

/** Full product shot (hero / detail / news card). */
export const PLATFORM_ART: Record<string, string> = {
  // ── 1990s home ──
  tes_64: `${BASE}/tes_64.jpg`,
  dreamvast: `${BASE}/dreamvast.jpg`,

  // ── Sixth gen ──
  playsystem_2: `${BASE}/playsystem_2.jpg`,
  playsystem_2_slim: `${BASE}/playsystem_2_slim.jpg`,
  mbox: `${BASE}/mbox.jpg`,
  game_sphere: `${BASE}/game_sphere.jpg`,
  gs: `${BASE}/gs.jpg`,

  // ── Handhelds ──
  "3gs": `${BASE}/3gs.jpg`,
  pps: `${BASE}/pps.jpg`,
  "2gs": `${BASE}/2gs.jpg`,

  // ── Motion / living room ──
  nuu: `${BASE}/nuu.jpg`,

  // ── Seventh gen ──
  mbox_360: `${BASE}/mbox_360.jpg`,

  // ── Tablets / micro ──
  mpad: `${BASE}/mpad.jpg`,
  oya: `${BASE}/oya.jpg`,

  // ── Eighth gen ──
  mbox_one: `${BASE}/mbox_one.jpg`,
  playsystem_4: `${BASE}/playsystem_4.jpg`,

  // ── Vena first-party hardware (existing) ──
  vena_oasis: `${BASE}/vena-genesis-x.jpg`,
  vena_gear: `${BASE}/vena-genesis-x-thumb.jpg`,
  vena_genesis_x: `${BASE}/vena-genesis-x.jpg`,
  vena_nova: `${BASE}/vena-nova.jpg`,
  vena_edge: `${BASE}/vena-edge.jpg`,
  vena_echo: `${BASE}/vena-echo.jpg`,
  vena_cosmos: `${BASE}/vena-cosmos.jpg`,

  // Helix SAGA three-tier (Vena industrial language)
  saga_nova: `${BASE}/vena-nova.jpg`,
  saga_blitz: `${BASE}/vena-edge.jpg`,
  saga_apex: `${BASE}/vena-echo.jpg`,
};

export const PLATFORM_THUMB: Record<string, string> = {
  tes_64: `${BASE}/tes_64-thumb.jpg`,
  dreamvast: `${BASE}/dreamvast-thumb.jpg`,
  playsystem_2: `${BASE}/playsystem_2-thumb.jpg`,
  playsystem_2_slim: `${BASE}/playsystem_2_slim-thumb.jpg`,
  mbox: `${BASE}/mbox-thumb.jpg`,
  game_sphere: `${BASE}/game_sphere-thumb.jpg`,
  gs: `${BASE}/gs-thumb.jpg`,
  "3gs": `${BASE}/3gs-thumb.jpg`,
  pps: `${BASE}/pps-thumb.jpg`,
  "2gs": `${BASE}/2gs-thumb.jpg`,
  nuu: `${BASE}/nuu-thumb.jpg`,
  mbox_360: `${BASE}/mbox_360-thumb.jpg`,
  mpad: `${BASE}/mpad-thumb.jpg`,
  oya: `${BASE}/oya-thumb.jpg`,
  mbox_one: `${BASE}/mbox_one-thumb.jpg`,
  playsystem_4: `${BASE}/playsystem_4-thumb.jpg`,

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

export const VENA_BRAND_ART = `${BASE}/vena-cosmos.jpg`;

export function platformArt(id: string): string | undefined {
  return PLATFORM_ART[id];
}

export function platformThumb(id: string): string | undefined {
  return PLATFORM_THUMB[id] ?? PLATFORM_ART[id];
}
