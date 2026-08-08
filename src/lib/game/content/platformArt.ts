/**
 * Product photography for platforms.
 * Paths under /art/platforms/
 * Owner product shots (no-bg + white-studio) mapped by catalog id.
 */

const BASE = "/art/platforms";

/** Full product shot (hero / detail / news card). */
export const PLATFORM_ART: Record<string, string> = {
  // ── Day-one / early computers ──
  pc: `${BASE}/pc.jpg`,
  commodore: `${BASE}/commodore.jpg`,
  grapintosh: `${BASE}/grapintosh.jpg`,

  // ── 1980s home / handheld ──
  itara_5200: `${BASE}/itara_5200.jpg`,
  tes: `${BASE}/tes.jpg`,
  master_v: `${BASE}/master_v.jpg`,
  itara_backflash: `${BASE}/itara_backflash.jpg`,
  vena_oasis: `${BASE}/vena_oasis.jpg`,
  vena_genesis_x: `${BASE}/vena_genesis_x.jpg`,
  grmac: `${BASE}/grmac.jpg`,
  gameling: `${BASE}/gameling.jpg`,
  vena_gear: `${BASE}/vena_gear.jpg`,
  super_tes: `${BASE}/super_tes.jpg`,

  // ── 1990s home / handheld ──
  playsystem: `${BASE}/playsystem.jpg`,
  tes_64: `${BASE}/tes_64.jpg`,
  gameling_color: `${BASE}/gameling_color.jpg`,
  dreamvast: `${BASE}/dreamvast.jpg`,
  game_sphere: `${BASE}/game_sphere.jpg`,

  // ── Sixth gen ──
  playsystem_2: `${BASE}/playsystem_2.jpg`,
  playsystem_2_slim: `${BASE}/playsystem_2_slim.jpg`,
  mbox: `${BASE}/mbox.jpg`,
  gs: `${BASE}/gs.jpg`,

  // ── Handhelds ──
  "3gs": `${BASE}/3gs.jpg`,
  pps: `${BASE}/pps.jpg`,
  "2gs": `${BASE}/2gs.jpg`,

  // ── Motion / living room ──
  nuu: `${BASE}/nuu.jpg`,

  // ── Seventh gen ──
  mbox_360: `${BASE}/mbox_360.jpg`,

  // ── Mobile / tablets / micro ──
  grphone: `${BASE}/grphone.jpg`,
  mpad: `${BASE}/mpad.jpg`,
  grpad: `${BASE}/mpad.jpg`, // tablet form language until dedicated grPad art
  oya: `${BASE}/oya.jpg`,

  // ── Eighth gen ──
  mbox_one: `${BASE}/mbox_one.jpg`,
  playsystem_4: `${BASE}/playsystem_4.jpg`,
  /** Nuu² docked hybrid — Swap-era form language. */
  swap: `${BASE}/swap.jpg`,

  // ── Current / next ──
  mbox_next: `${BASE}/mbox_next.jpg`,
  playsystem_5: `${BASE}/playsystem_5.jpg`,
  holo_box: `${BASE}/holo_box.jpg`,

  // ── Vena first-party + Helix SAGA ──
  vena_nova: `${BASE}/vena_nova.jpg`,
  vena_edge: `${BASE}/vena_edge.jpg`,
  vena_echo: `${BASE}/vena-echo.jpg`,
  vena_cosmos: `${BASE}/vena-cosmos.jpg`,
  saga_nova: `${BASE}/vena_nova.jpg`,
  saga_blitz: `${BASE}/vena_edge.jpg`,
  saga_apex: `${BASE}/vena-echo.jpg`,
  // 2022–2026 reuse nearest-gen product art
  swap_oled: `${BASE}/swap.jpg`,
  cloud_play: `${BASE}/pc_late.jpg`,
  mbox_next_s: `${BASE}/mbox_next.jpg`,
  vena_flux: `${BASE}/vena-echo.jpg`,
  playsystem_5_pro: `${BASE}/playsystem_5.jpg`,
  swap_2: `${BASE}/swap.jpg`,
  holo_sphere: `${BASE}/holo_box.jpg`,
  playsystem_6: `${BASE}/playsystem_5.jpg`,
  mbox_future: `${BASE}/mbox_next.jpg`,

};

export const PLATFORM_THUMB: Record<string, string> = {
  pc: `${BASE}/pc-thumb.jpg`,
  commodore: `${BASE}/commodore-thumb.jpg`,
  grapintosh: `${BASE}/grapintosh-thumb.jpg`,

  itara_5200: `${BASE}/itara_5200-thumb.jpg`,
  tes: `${BASE}/tes-thumb.jpg`,
  master_v: `${BASE}/master_v-thumb.jpg`,
  itara_backflash: `${BASE}/itara_backflash-thumb.jpg`,
  vena_oasis: `${BASE}/vena_oasis-thumb.jpg`,
  vena_genesis_x: `${BASE}/vena_genesis_x-thumb.jpg`,
  grmac: `${BASE}/grmac-thumb.jpg`,
  gameling: `${BASE}/gameling-thumb.jpg`,
  vena_gear: `${BASE}/vena_gear-thumb.jpg`,
  super_tes: `${BASE}/super_tes-thumb.jpg`,

  playsystem: `${BASE}/playsystem-thumb.jpg`,
  tes_64: `${BASE}/tes_64-thumb.jpg`,
  gameling_color: `${BASE}/gameling_color-thumb.jpg`,
  dreamvast: `${BASE}/dreamvast-thumb.jpg`,
  game_sphere: `${BASE}/game_sphere-thumb.jpg`,

  playsystem_2: `${BASE}/playsystem_2-thumb.jpg`,
  playsystem_2_slim: `${BASE}/playsystem_2_slim-thumb.jpg`,
  mbox: `${BASE}/mbox-thumb.jpg`,
  gs: `${BASE}/gs-thumb.jpg`,

  "3gs": `${BASE}/3gs-thumb.jpg`,
  pps: `${BASE}/pps-thumb.jpg`,
  "2gs": `${BASE}/2gs-thumb.jpg`,

  nuu: `${BASE}/nuu-thumb.jpg`,
  mbox_360: `${BASE}/mbox_360-thumb.jpg`,

  grphone: `${BASE}/grphone-thumb.jpg`,
  mpad: `${BASE}/mpad-thumb.jpg`,
  grpad: `${BASE}/mpad-thumb.jpg`,
  oya: `${BASE}/oya-thumb.jpg`,

  mbox_one: `${BASE}/mbox_one-thumb.jpg`,
  playsystem_4: `${BASE}/playsystem_4-thumb.jpg`,
  swap: `${BASE}/swap-thumb.jpg`,

  mbox_next: `${BASE}/mbox_next-thumb.jpg`,
  playsystem_5: `${BASE}/playsystem_5-thumb.jpg`,
  holo_box: `${BASE}/holo_box-thumb.jpg`,

  vena_nova: `${BASE}/vena_nova-thumb.jpg`,
  vena_edge: `${BASE}/vena_edge-thumb.jpg`,
  vena_echo: `${BASE}/vena-echo-thumb.jpg`,
  vena_cosmos: `${BASE}/vena-cosmos-thumb.jpg`,
  saga_nova: `${BASE}/vena_nova-thumb.jpg`,
  saga_blitz: `${BASE}/vena_edge-thumb.jpg`,
  saga_apex: `${BASE}/vena-echo-thumb.jpg`,
  swap_oled: `${BASE}/swap-thumb.jpg`,
  cloud_play: `${BASE}/pc_late-thumb.jpg`,
  mbox_next_s: `${BASE}/mbox_next-thumb.jpg`,
  vena_flux: `${BASE}/vena-echo-thumb.jpg`,
  playsystem_5_pro: `${BASE}/playsystem_5-thumb.jpg`,
  swap_2: `${BASE}/swap-thumb.jpg`,
  holo_sphere: `${BASE}/holo_box-thumb.jpg`,
  playsystem_6: `${BASE}/playsystem_5-thumb.jpg`,
  mbox_future: `${BASE}/mbox_next-thumb.jpg`,

};

/**
 * PC is one platform id for the whole campaign, but art evolves:
 * early beige (1979–1999), mid RGB tower (2000–2011), late glass (2012+).
 */
export function pcArtForYear(year: number, thumb = false): string {
  const stem = year >= 2012 ? "pc_late" : year >= 2000 ? "pc_mid" : "pc";
  return `${BASE}/${stem}${thumb ? "-thumb" : ""}.jpg`;
}

export const VENA_BRAND_ART = `${BASE}/vena-cosmos.jpg`;

/** Staged product shots (files live; optional / future catalog use). */
export const STAGED_PLATFORM_ART: Record<string, string> = {
  compustar: `${BASE}/compustar.jpg`,
  nuu_2: `${BASE}/nuu_2.jpg`,
  mphone: `${BASE}/mphone.jpg`,
  mpad_pro: `${BASE}/mpad_pro.jpg`,
  pc_mid: `${BASE}/pc_mid.jpg`,
  pc_late: `${BASE}/pc_late.jpg`,
  mbox_one_studio: `${BASE}/mbox_one_studio.jpg`,
  mpad_studio: `${BASE}/mpad_studio.jpg`,
};

export function platformArt(id: string, year?: number): string | undefined {
  if (id === "pc" && year != null) return pcArtForYear(year, false);
  return PLATFORM_ART[id];
}

export function platformThumb(id: string, year?: number): string | undefined {
  if (id === "pc" && year != null) return pcArtForYear(year, true);
  return PLATFORM_THUMB[id] ?? PLATFORM_ART[id];
}
