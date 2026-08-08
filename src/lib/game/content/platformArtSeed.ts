import { CHUNK_0 } from "./platform-art-seed/chunk0";
import { CHUNK_1 } from "./platform-art-seed/chunk1";
import { CHUNK_2 } from "./platform-art-seed/chunk2";
import { CHUNK_3 } from "./platform-art-seed/chunk3";
import { CHUNK_4 } from "./platform-art-seed/chunk4";
import { CHUNK_5 } from "./platform-art-seed/chunk5";

export const PLATFORM_ART_SEED = [
  ...CHUNK_0,
  ...CHUNK_1,
  ...CHUNK_2,
  ...CHUNK_3,
  ...CHUNK_4,
  ...CHUNK_5,
] as const;

export function platformDataUrl(id: string, kind: "full" | "thumb" = "full"): string | undefined {
  const row = PLATFORM_ART_SEED.find((r) => r.id === id);
  if (!row) return undefined;
  const b64 = kind === "thumb" ? row.thumb : row.full;
  return `data:image/jpeg;base64,${b64}`;
}
