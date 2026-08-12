import { z } from "zod";

import { ALL_SAVE_KEYS, SAVE_KEY_V6 } from "./contracts";

/** Current key — must match data.SAVE_KEY / SCHEMA_VERSION 6. */
export const SAVE_KEY = SAVE_KEY_V6;

/** Current key first, followed by every save key shipped by an earlier build. */
export const SAVE_KEYS = ALL_SAVE_KEYS;

/** Multi-slot campaign keys (3 slots to match glass board art). */
export const SAVE_SLOT_COUNT = 3;
export const ACTIVE_SLOT_KEY = "studio-empire-active-slot";

export function saveSlotKey(slot: number): string {
  const s = Math.min(SAVE_SLOT_COUNT, Math.max(1, Math.floor(slot)));
  return `${SAVE_KEY}-slot-${s}`;
}

export function allSlotKeys(): string[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => saveSlotKey(i + 1));
}

type StorageReader = Pick<Storage, "getItem">;
type StorageRemover = Pick<Storage, "removeItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const objectRecord = z.object({}).loose();
const finiteNumber = z.number().finite();

/**
 * Runtime boundary for imported/loaded saves. Migrations still own defaults;
 * this schema prevents structurally dangerous JSON from replacing a campaign.
 */
const saveCandidateSchema = z
  .object({
    version: z.number().int().positive().optional(),
    phase: z.enum(["menu", "playing", "gameover"]).optional(),
    companyName: z.string().max(64).optional(),
    week: finiteNumber.nonnegative().optional(),
    year: finiteNumber.optional(),
    month: finiteNumber.optional(),
    cash: finiteNumber.optional(),
    fans: finiteNumber.nonnegative().optional(),
    researchPoints: finiteNumber.nonnegative().optional(),
    office: finiteNumber.optional(),
    staff: z.array(objectRecord).optional(),
    currentProject: objectRecord.nullable().optional(),
    releasedGames: z.array(objectRecord).optional(),
    activeSales: z.array(objectRecord).optional(),
    settings: objectRecord.optional(),
  })
  .loose();

export type SaveCandidate = z.infer<typeof saveCandidateSchema>;

export type SaveSlotMeta = {
  slot: number;
  empty: boolean;
  companyName: string;
  year: number;
  month: number;
  week: number;
  cash: number;
  fans: number;
  office: number;
  gamesPublished: number;
};

export function parseSaveCandidate(raw: string): SaveCandidate | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = saveCandidateSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function getActiveSlot(storage: StorageReader): number {
  try {
    const v = Number(storage.getItem(ACTIVE_SLOT_KEY));
    if (v >= 1 && v <= SAVE_SLOT_COUNT) return v;
  } catch {
    /* */
  }
  return 1;
}

export function setActiveSlot(storage: StorageWriter, slot: number): void {
  const s = Math.min(SAVE_SLOT_COUNT, Math.max(1, Math.floor(slot)));
  storage.setItem(ACTIVE_SLOT_KEY, String(s));
}

/** Prefer slot keys, then legacy single-key saves. */
export function findSave(storage: StorageReader): { key: string; raw: string; slot: number | null } | null {
  const active = getActiveSlot(storage);
  const activeKey = saveSlotKey(active);
  const activeRaw = storage.getItem(activeKey);
  if (activeRaw) return { key: activeKey, raw: activeRaw, slot: active };

  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const key = saveSlotKey(i);
    const raw = storage.getItem(key);
    if (raw) return { key, raw, slot: i };
  }

  for (const key of SAVE_KEYS) {
    const raw = storage.getItem(key);
    if (raw) return { key, raw, slot: null };
  }
  return null;
}

export function listSaveSlots(storage: StorageReader): SaveSlotMeta[] {
  const slots: SaveSlotMeta[] = [];
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const raw = storage.getItem(saveSlotKey(i));
    // migrate: slot 1 can fall back to legacy single save
    const legacy = i === 1 ? SAVE_KEYS.map((k) => storage.getItem(k)).find(Boolean) : null;
    const useRaw = raw || legacy || null;
    if (!useRaw) {
      slots.push({
        slot: i,
        empty: true,
        companyName: "",
        year: 0,
        month: 0,
        week: 0,
        cash: 0,
        fans: 0,
        office: 1,
        gamesPublished: 0,
      });
      continue;
    }
    const parsed = parseSaveCandidate(useRaw);
    const games = Array.isArray(parsed?.releasedGames) ? parsed!.releasedGames!.length : 0;
    slots.push({
      slot: i,
      empty: false,
      companyName: parsed?.companyName || "Studio",
      year: Number(parsed?.year) || 0,
      month: Number(parsed?.month) || 1,
      week: Number(parsed?.week) || 0,
      cash: Number(parsed?.cash) || 0,
      fans: Number(parsed?.fans) || 0,
      office: Number(parsed?.office) || 1,
      gamesPublished: games,
    });
  }
  return slots;
}

export function removeAllSaves(storage: StorageRemover): void {
  for (const key of SAVE_KEYS) storage.removeItem(key);
  for (const key of allSlotKeys()) storage.removeItem(key);
}

export function removeSaveSlot(storage: StorageWriter, slot: number): void {
  storage.removeItem(saveSlotKey(slot));
  if (slot === 1) {
    for (const key of SAVE_KEYS) storage.removeItem(key);
  }
}
