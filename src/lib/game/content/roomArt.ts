/**
 * Studio Empire room art — ONLY the user's high-quality 3D/photoreal stills.
 *
 * Level 1 (Garage) — current hero set:
 *   IMG_0974 → room-garage.jpg       (wide garage: CRT desk + covered car)
 *   IMG_0975 → desk-garage.jpg       (develop desk POV, CRT stack)
 *   Menu uses the same L1 garage identity (room-garage-empty = 0974 plate)
 *
 * Later tiers (still from owner's packs):
 *   IMG_0870 → room-office.jpg · IMG_0866 → desk-office.jpg
 *   IMG_0869 → room-studio.jpg · IMG_0895 → desk-studio.jpg
 *   IMG_0741 → room-hq-penthouse.jpg · IMG_0878 → desk-empire.jpg
 *   Labs/HQ: IMG_0732–0746 series
 *
 * Cartoon/legacy (garage-bg, office-small, founder-cut) live in
 * public/art/_legacy_unused/ and MUST NOT be referenced.
 */

export type RoomEraId = "garage" | "office" | "studio" | "empire";

export type DepartmentRoomId =
  | "loft"
  | "team"
  | "modern"
  | "campus"
  | "showroom"
  | "rnd"
  | "hardware"
  | "boardroom"
  | "ceo";

export type LabTier = "3.10" | "3.2";

export interface RoomArtDef {
  id: RoomEraId;
  officeMin: number;
  label: string;
  room: string;
  desk: string;
  objectPosition: string;
  showFounderSprite: boolean;
  hotspotIdle: string;
  hotspotBusy: string;
  hotspotOpen: string;
}

/** Primary ladder — full-quality user stills only. */
export const ROOM_ART_LADDER: RoomArtDef[] = [
  {
    id: "garage",
    officeMin: 1,
    label: "Garage loft",
    room: "/art/room-garage.jpg",
    desk: "/art/desk-garage.jpg",
    objectPosition: "center 55%",
    showFounderSprite: false,
    hotspotIdle: "Tap garage · start a game",
    hotspotBusy: "Code scrolling on the CRTs…",
    hotspotOpen: "Open founder desk",
  },
  {
    id: "office",
    officeMin: 2,
    label: "High-rise office",
    room: "/art/room-office.jpg",
    desk: "/art/desk-office.jpg",
    objectPosition: "center 40%",
    showFounderSprite: false,
    hotspotIdle: "Tap desk · start a game",
    hotspotBusy: "City skyline coding…",
    hotspotOpen: "Open workstation",
  },
  {
    id: "studio",
    officeMin: 3,
    label: "Executive study",
    room: "/art/room-studio.jpg",
    desk: "/art/desk-studio.jpg",
    objectPosition: "center 38%",
    showFounderSprite: false,
    hotspotIdle: "Tap study · start a game",
    hotspotBusy: "Blueprints on the desk…",
    hotspotOpen: "Open production desk",
  },
  {
    id: "empire",
    officeMin: 4,
    label: "LVL 4 HQ",
    room: "/art/room-hq-penthouse.jpg",
    desk: "/art/desk-empire.jpg",
    objectPosition: "center 42%",
    showFounderSprite: false,
    hotspotIdle: "Tap penthouse · start a title",
    hotspotBusy: "Empire dashboards live…",
    hotspotOpen: "Open CEO desk",
  },
];

export const MENU_ROOM_ART = "/art/room-garage-empty.jpg";

/** Map office tier (1–5) → room art ladder entry. */
export function roomArtForOffice(office: number): RoomArtDef {
  const o = Math.max(1, Math.min(5, office | 0));
  if (o >= 4) return ROOM_ART_LADDER[3]!;
  if (o === 3) return ROOM_ART_LADDER[2]!;
  if (o === 2) return ROOM_ART_LADDER[1]!;
  return ROOM_ART_LADDER[0]!;
}

export function eraIdForOffice(office: number): RoomEraId {
  return roomArtForOffice(office).id;
}

export type ScreenRoomKey =
  | "studio"
  | "develop"
  | "games"
  | "research"
  | "engines"
  | "platforms"
  | "staff"
  | "finances"
  | "market"
  | "more";

/** Screen → department room id (null = use office ladder). */
export const SCREEN_ROOM: Partial<Record<ScreenRoomKey, DepartmentRoomId>> = {
  staff: "team",
  finances: "loft",
  market: "showroom",
  more: "boardroom",
};

/** Department stills (user HQ photos). */
export const DEPARTMENT_ROOMS: Record<
  DepartmentRoomId,
  { src: string; label: string; objectPosition: string }
> = {
  loft: {
    src: "/art/room-dept-loft.jpg",
    label: "Loft ops",
    objectPosition: "center 45%",
  },
  team: {
    src: "/art/room-dept-team.jpg",
    label: "Team floor",
    objectPosition: "center 40%",
  },
  modern: {
    src: "/art/room-dept-modern.jpg",
    label: "Modern floor",
    objectPosition: "center 40%",
  },
  campus: {
    src: "/art/room-dept-campus.jpg",
    label: "Campus",
    objectPosition: "center 42%",
  },
  showroom: {
    src: "/art/room-hq-showroom.jpg",
    label: "Showroom",
    objectPosition: "center 40%",
  },
  rnd: {
    src: "/art/room-lab-rnd-32.jpg",
    label: "R&D lab",
    objectPosition: "center 45%",
  },
  hardware: {
    src: "/art/room-lab-hw-310.jpg",
    label: "Hardware lab",
    objectPosition: "center 45%",
  },
  boardroom: {
    src: "/art/room-boardroom.jpg",
    label: "Boardroom",
    objectPosition: "center 40%",
  },
  ceo: {
    src: "/art/room-hq-penthouse.jpg",
    label: "CEO suite",
    objectPosition: "center 42%",
  },
};

/** Lab stills by kind and visual tier. */
export const LAB_ART: Record<
  "rnd" | "hardware",
  Record<LabTier, { src: string; label: string; objectPosition: string }>
> = {
  rnd: {
    "3.2": {
      src: "/art/room-lab-rnd-32.jpg",
      label: "R&D lab (3.2)",
      objectPosition: "center 45%",
    },
    "3.10": {
      src: "/art/room-lab-rnd-310.jpg",
      label: "R&D lab (3.10)",
      objectPosition: "center 45%",
    },
  },
  hardware: {
    "3.2": {
      src: "/art/room-lab-hw-32.jpg",
      label: "Hardware lab (3.2)",
      objectPosition: "center 45%",
    },
    "3.10": {
      src: "/art/room-lab-hw-310.jpg",
      label: "Hardware lab (3.10)",
      objectPosition: "center 45%",
    },
  },
};

export function labTierFor(office: number, year: number): LabTier {
  // Prefer higher-spec lab stills from mid-90s / larger offices
  if (office >= 4 || year >= 1995) return "3.10";
  return "3.2";
}

export function departmentRoom(id: DepartmentRoomId) {
  return DEPARTMENT_ROOMS[id];
}

/** Lab room by type + era (still uses owner stills). */
export function labRoom(
  kind: "rnd" | "hardware",
  office = 1,
  year = 1979,
): { src: string; label: string; objectPosition: string } {
  return LAB_ART[kind][labTierFor(office, year)];
}

export function screenRoomArt(
  screen: keyof typeof SCREEN_ROOM | ScreenRoomKey | string,
  office = 1,
  year = 1979,
): { src: string; label: string; objectPosition: string } {
  if (screen === "research" || screen === "engines") {
    return labRoom("rnd", office, year);
  }
  if (screen === "platforms") {
    return labRoom("hardware", office, year);
  }
  const id = SCREEN_ROOM[screen as ScreenRoomKey];
  if (id) return DEPARTMENT_ROOMS[id];
  const art = roomArtForOffice(office);
  return {
    src: art.room,
    label: art.label,
    objectPosition: art.objectPosition,
  };
}
