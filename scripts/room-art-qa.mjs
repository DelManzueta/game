import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.screenshot({ path: "/workspace/screenshots/room-menu.png", fullPage: false });

await page.getByRole("button", { name: /New Campaign/i }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/workspace/screenshots/room-garage-play.png", fullPage: false });

const srcs = await page.evaluate(() =>
  Array.from(document.querySelectorAll("img")).map((i) => i.getAttribute("src")).filter(Boolean)
);
console.log("IMGS", srcs.filter((s) => s && s.includes("/art/")));

// Open menu -> cheats
await page.getByRole("button", { name: /Menu/i }).first().click();
await page.waitForTimeout(400);
const cheatBtn = page.getByRole("button", { name: /Cheat|Debug/i }).first();
if (await cheatBtn.count()) {
  await cheatBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/workspace/screenshots/room-cheats.png", fullPage: false });
  // click any office upgrade cheat
  const texts = await page.locator("button").allTextContents();
  console.log("CHEAT_BTNS", texts.slice(0, 40));
  for (const t of texts) {
    if (/office|hq|empire|downtown|tier|lvl/i.test(t)) {
      await page.getByRole("button", { name: t, exact: true }).first().click().catch(() => {});
      await page.waitForTimeout(150);
    }
  }
  // close
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const srcs2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img")).map((i) => i.getAttribute("src")).filter(Boolean)
  );
  console.log("IMGS2", srcs2.filter((s) => s && s.includes("/art/")));
  await page.screenshot({ path: "/workspace/screenshots/room-after-cheat.png", fullPage: false });
} else {
  console.log("no cheats button");
  const body = await page.locator("body").innerText();
  console.log(body.slice(0, 500));
}

await browser.close();
console.log("done");
