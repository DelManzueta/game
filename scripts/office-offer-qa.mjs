#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const outDir = "/workspace/screenshots";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message || e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);

const newCamp = page.getByRole("button", { name: /New Campaign/i });
if (await newCamp.isVisible().catch(() => false)) await newCamp.click();
await page.waitForTimeout(400);
const input = page.locator("input").first();
if (await input.isVisible().catch(() => false)) await input.fill("CP1 Test Studio");
const start = page.getByRole("button", { name: /Start|Begin|Found|Create|Launch|Play/i }).first();
if (await start.isVisible().catch(() => false)) await start.click();
await page.waitForTimeout(1000);

await page.screenshot({ path: `${outDir}/cp01-garage-proofs.png` });

// Pause → Cheats
await page.getByRole("button", { name: /^Pause$/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/cp01-pause.png` });
const cheatOpen = page.getByRole("button", { name: /Cheat/i }).first();
await cheatOpen.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/cp01-cheats.png` });

const officeReady = page.locator("button", { hasText: /Office-ready/i }).first();
if (await officeReady.isVisible().catch(() => false)) {
  await officeReady.click();
  await page.waitForTimeout(1000);
  console.log("OFFICE_READY_APPLIED");
} else {
  const texts = await page.locator("button").allTextContents();
  console.log("CHEAT_BUTTONS", texts.join(" || "));
}

await page.screenshot({ path: `${outDir}/cp01-office-offer.png` });
let body = await page.locator("body").innerText();
console.log("AFTER_CHEAT:", body.slice(0, 700).replace(/\n/g, " | "));
console.log("HAS_MODAL:", /real office|Accept move|Decide later/i.test(body));

// If modal open, accept move
const accept = page.getByRole("button", { name: /Accept move/i });
if (await accept.isVisible().catch(() => false)) {
  // first defer to test defer
  const defer = page.getByRole("button", { name: /Decide later/i });
  if (await defer.isVisible().catch(() => false)) {
    await defer.click();
    await page.waitForTimeout(500);
    console.log("DEFERRED");
    await page.screenshot({ path: `${outDir}/cp01-deferred.png` });
  }
  // reopen
  const view = page.getByRole("button", { name: /View office offer/i });
  if (await view.isVisible().catch(() => false)) {
    await view.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${outDir}/cp01-offer-reopen.png` });
  const accept2 = page.getByRole("button", { name: /Accept move/i });
  if (await accept2.isVisible().catch(() => false)) {
    await accept2.click();
    await page.waitForTimeout(600);
    console.log("ACCEPTED");
  }
}

await page.screenshot({ path: `${outDir}/cp01-after-accept.png` });
body = await page.locator("body").innerText();
console.log("POST_ACCEPT:", body.slice(0, 500).replace(/\n/g, " | "));

// advance weeks with Play or advance
const play = page.getByRole("button", { name: /^Play$/i });
if (await play.isVisible().catch(() => false)) {
  await play.click();
  await page.waitForTimeout(3500); // allow ~2+ weeks
  await page.getByRole("button", { name: /^Pause$/i }).click().catch(() => {});
}
await page.screenshot({ path: `${outDir}/cp01-after-weeks.png` });
body = await page.locator("body").innerText();
console.log("POST_WEEKS:", body.slice(0, 500).replace(/\n/g, " | "));
console.log("FIRST_OFFICE:", /First Office|4 HQ|Welcome to/i.test(body));
console.log("ERRORS:", errors.length ? errors.join(" || ") : "none");

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/cp01-mobile.png` });

await browser.close();
process.exit(errors.length ? 2 : 0);
