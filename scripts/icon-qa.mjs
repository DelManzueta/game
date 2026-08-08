import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /New Campaign/i }).click();
await page.waitForTimeout(900);
const icons = await page.evaluate(() =>
  Array.from(document.querySelectorAll('img[src*="/art/ui/icons/"]')).map(i => i.getAttribute("src"))
);
console.log("ICONS", icons);
console.log("ERRS", errs);
await page.screenshot({ path: "/workspace/screenshots/icons-in-hud.png" });
await browser.close();
