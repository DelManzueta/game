import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errs=[];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "/workspace/screenshots/menu-glass-home.png" });
await page.getByRole("button", { name: /New Campaign/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/menu-glass-new.png" });
// start game
await page.getByRole("button", { name: /Start in slot/i }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/menu-after-start.png" });
// back to menu via pause
await page.getByRole("button", { name: /Menu/i }).first().click();
await page.waitForTimeout(300);
const toMenu = page.getByRole("button", { name: /Main menu|Return to menu|Quit to menu/i });
if (await toMenu.count()) {
  await toMenu.first().click();
  await page.waitForTimeout(500);
}
await page.screenshot({ path: "/workspace/screenshots/menu-with-save.png" });
// try load board
const cont = page.getByRole("button", { name: /Continue|Load/i });
if (await cont.count()) {
  await cont.first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/workspace/screenshots/menu-save-slots.png" });
}
console.log("ERRS", errs);
const frames = await page.evaluate(() =>
  Array.from(document.querySelectorAll("img")).map(i=>i.src).filter(s=>s.includes("/art/ui/frames/"))
);
console.log("FRAMES", frames);
await browser.close();
