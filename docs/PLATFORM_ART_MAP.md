# Platform product art map

**Path:** `public/art/platforms/{id}.jpg` + `{id}-thumb.jpg`  
**Lookup:** `platformArt(id, year?)` / `platformThumb(id, year?)`

## Batch 2026-08-08e — Classics refresh + 6th/7th gen

| Catalog id | Display | Source | BG |
|------------|---------|--------|-----|
| `master_v` | Master V | IMG_1007 | black |
| `mbox` | mBox | IMG_1008 | black |
| `dreamvast` | DreamVast | IMG_1009 | black |
| `playsystem` | Playsystem | IMG_1010 | black |
| `gameling_color` | Gameling Color | IMG_1011 | black |
| `grmac` | grMac | IMG_1012 | black |
| `gameling` | Gameling | IMG_1013 | black |
| `vena_gear` | Vena Gear | IMG_1014 | black |
| `tes_64` | TES 64 | IMG_1015 | white |
| `oya` | OYA | IMG_1016 | white |
| `gs` | GS | IMG_1017 | white |
| `mbox_360` | mBox 360 | IMG_1018 | white |

## Prior HD / hybrid batch

| Catalog id | Source notes |
|------------|--------------|
| `nuu` | Beige motion |
| `2gs` | Dual-screen handheld |
| `playsystem_2_slim` | Slim black/blue |
| `mpad` / `grpad` | Classic tablet |
| `mbox_one` | Black cube |
| `playsystem_4` / `playsystem_5` | Angular + dual-wing |
| `mbox_next` | Tall green tower |
| `holo_box` | Translucent |
| `grphone` | mPhone shot |
| `vena_genesis_x` / `vena_nova` / `vena_edge` | Vena line |
| `swap` | Nuu² hybrid form |

## PC year art

| Campaign year | File |
|---------------|------|
| < 2000 | `pc.jpg` beige CRT+tower |
| 2000–2011 | `pc_mid.jpg` RGB tower |
| ≥ 2012 | `pc_late.jpg` glass RGB |

## Staged (no exclusive catalog id)

`compustar`, `nuu_2`, `mphone`, `mpad_pro`, `mbox_one_studio`, `mpad_studio`

## Still missing art

`itara`, `odyssey`, `intelli`, `arcade`, `playsystem_3`, `wuu`, `mbox_360_slim`, `viva_playsystem`

## Rules

1. Catalog `year` in `platforms.ts` is industry-clock authority.
2. Prefer no-bg product cards for dark Systems UI when available.
3. Thumbs ~320px; full ~900px.
4. Newer owner shots supersede older files for the same id.
