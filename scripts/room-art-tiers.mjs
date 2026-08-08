import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /New Campaign/i }).click();
await page.waitForTimeout(600);

// Access zustand store via window if available; otherwise use cheat UI + evaluate store from module
// Patch: call applyCheat through React by opening cheats and using exposed store on window
const storeOk = await page.evaluate(async () => {
  // try find zustand persist
  const keys = Object.keys(window);
  return keys.filter(k => /game|store|zustand/i.test(k)).slice(0, 20);
});
console.log("window keys", storeOk);

// Use UI: open menu, cheats, then for each office use evaluate to dispatch if we can import
// Simpler: localStorage isn't enough. Call via clicking if we add buttons.
// Direct approach: use page.evaluate on Vite HMR module - hard.

// Instead click "Office-ready pack" then manually set via cheat - not available.
// Inject script that imports store from same origin - won't work cross-module easily.

// Fallback: use Playwright to open cheats and click Move to final for empire, 
// and for office 2 use upgrade flow with cash/fans cheats... too heavy.

// Read source map - useGame is zustand. Expose temporarily?
await page.evaluate(() => {
  // Nothing
});

// Screenshot garage, then use console to set localStorage save with office field
const save = await page.evaluate(() => {
  const raw = localStorage.getItem("studio-empire-save") || localStorage.getItem("studioEmpireSave") || null;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  return { keys, raw: raw ? raw.slice(0, 200) : null };
});
console.log("ls", save);

await page.screenshot({ path: "/workspace/screenshots/tier-1-garage.png" });
await browser.close();
