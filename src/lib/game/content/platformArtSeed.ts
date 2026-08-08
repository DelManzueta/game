import { ART as _tes_64 } from "./one/tes_64";
import { ART as _dreamvast } from "./one/dreamvast";
import { ART as _playsystem_2 } from "./one/playsystem_2";
import { ART as _playsystem_2_slim } from "./one/playsystem_2_slim";
import { ART as _mbox } from "./one/mbox";
import { ART as _game_sphere } from "./one/game_sphere";
import { ART as _gs } from "./one/gs";
import { ART as _3gs } from "./one/3gs";
import { ART as _pps } from "./one/pps";
import { ART as _nuu } from "./one/nuu";
import { ART as _2gs } from "./one/2gs";
import { ART as _mbox_360 } from "./one/mbox_360";
import { ART as _mpad } from "./one/mpad";
import { ART as _oya } from "./one/oya";
import { ART as _mbox_one } from "./one/mbox_one";
import { ART as _playsystem_4 } from "./one/playsystem_4";

export const PLATFORM_ART_SEED = [
  _tes_64,
  _dreamvast,
  _playsystem_2,
  _playsystem_2_slim,
  _mbox,
  _game_sphere,
  _gs,
  _3gs,
  _pps,
  _nuu,
  _2gs,
  _mbox_360,
  _mpad,
  _oya,
  _mbox_one,
  _playsystem_4,
] as const;

export function platformDataUrl(id: string, kind: "full" | "thumb" = "full"): string | undefined {
  const row = PLATFORM_ART_SEED.find((r) => r.id === id);
  if (!row) return undefined;
  const b64 = kind === "thumb" ? (row as any).thumb : row.full;
  return `data:image/jpeg;base64,${b64}`;
}
