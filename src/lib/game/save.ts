import { z } from "zod";

import { SAVE_KEY } from "./data";

/** Current key first, followed by every save key shipped by an earlier build. */
export const SAVE_KEYS = [
  SAVE_KEY,
  "studio-empire-save-v4",
  "studio-empire-save-v3",
  "studio-empire-save-v2",
  "studio-empire-save-v1",
] as const;

type StorageReader = Pick<Storage, "getItem">;
type StorageRemover = Pick<Storage, "removeItem">;

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
    staff: z.array(objectRecord).optional(),
    currentProject: objectRecord.nullable().optional(),
    releasedGames: z.array(objectRecord).optional(),
    activeSales: z.array(objectRecord).optional(),
    settings: objectRecord.optional(),
  })
  .loose();

export type SaveCandidate = z.infer<typeof saveCandidateSchema>;

export function parseSaveCandidate(raw: string): SaveCandidate | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = saveCandidateSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function findSave(storage: StorageReader): { key: string; raw: string } | null {
  for (const key of SAVE_KEYS) {
    const raw = storage.getItem(key);
    if (raw) return { key, raw };
  }
  return null;
}

export function removeAllSaves(storage: StorageRemover): void {
  for (const key of SAVE_KEYS) storage.removeItem(key);
}
