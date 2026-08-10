/**
 * Three scripted Garage release math traces (scoring only — no full UI).
 * Run: node scripts/foundation-campaign-trace.mjs
 */
import { createRequire } from "module";
// pure TS via dynamic - skip if not compiled; use classic formulas inline

function hashSeed(...parts) {
  const s = parts.map(String).join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function campaign(label, seed, design, tech, bugs, combo) {
  const hist0 = 35;
  const pts = design + tech;
  const raw = (pts / hist0) * 7 * combo - bugs * 0.1;
  const avg = Math.max(1, Math.min(10, Math.round(raw * 10) / 10));
  const hist1 = hist0 * 0.7 + pts * 0.3;
  const rng = mulberry(hashSeed(seed, "sales", 0));
  const base = pts * Math.pow(avg, 2.3) * 15;
  const weeks = [];
  let rem = base;
  for (let w = 0; w < 12; w++) {
    const decay = Math.pow(1 - w / 12, 2.2);
    const u = Math.max(0, Math.round((base / 12) * decay * (0.9 + rng() * 0.2)));
    weeks.push(u);
  }
  const units = weeks.reduce((a, b) => a + b, 0);
  const rev = units * 9.99 * 0.85;
  const fans = avg >= 8.5 ? 25 : avg >= 7 ? 10 : avg >= 5.5 ? 0 : -5;
  return { label, seed, design, tech, bugs, avg, hist0, hist1, units, rev, fans, weeks: weeks.slice(0, 4) };
}

const scenarios = [
  campaign("strong", 1001, 55, 50, 2, 1.3),
  campaign("average", 2002, 35, 30, 8, 1.0),
  campaign("poor", 3003, 18, 15, 22, 0.7),
];

for (const s of scenarios) {
  const again = campaign(s.label, s.seed, s.design, s.tech, s.bugs, s.label === "strong" ? 1.3 : s.label === "average" ? 1.0 : 0.7);
  const match = JSON.stringify(s) === JSON.stringify(again);
  console.log(JSON.stringify({ ...s, deterministicReplay: match }, null, 2));
}
