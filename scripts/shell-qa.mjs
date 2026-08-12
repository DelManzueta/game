import { chromium } from "playwright";

const url = "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(viewport, path) {
  const page = await browser.newPage({ viewport });
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(700);
  const btn = page.getByRole("button", { name: /New Campaign/i });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path, fullPage: false });
  const room = await page.locator(".se-room-img").count();
  const chip = await page.locator(".se-float").count();
  const hud = await page.locator(".se-top-vitals").count();
  await page.close();
  return { room, chip, hud, errors };
}

const desk = await shot({ width: 1280, height: 800 }, "/workspace/screenshots/room-first-desktop.png");
const mob = await shot({ width: 390, height: 844 }, "/workspace/screenshots/room-first-mobile.png");
console.log(JSON.stringify({ desk, mob }, null, 2));
await browser.close();
