import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /New Campaign/i }).click();
await page.waitForTimeout(700);

async function openCheats() {
  await page.getByRole("button", { name: /Menu/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Cheat|Debug/i }).first().click();
  await page.waitForTimeout(400);
}

async function setOffice(label) {
  await openCheats();
  await page.getByRole("button", { name: label, exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // ensure studio screen
  await page.getByRole("button", { name: /Garage|Studio|Desk|Home/i }).first().click().catch(()=>{});
  await page.waitForTimeout(200);
  const srcs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .map((i) => i.getAttribute("src"))
      .filter((s) => s && s.includes("/art/room"))
  );
  console.log(label, srcs);
  await page.screenshot({ path: `/workspace/screenshots/tier-${label.replace(/\s+/g,'-').toLowerCase()}.png` });
}

await page.screenshot({ path: "/workspace/screenshots/tier-garage-start.png" });
const src0 = await page.evaluate(() =>
  Array.from(document.querySelectorAll("img")).map(i=>i.getAttribute("src")).filter(s=>s&&s.includes("/art/"))
);
console.log("start", src0);

await setOffice("Small Office");
await setOffice("Downtown");
await setOffice("HQ");
await setOffice("Garage");

await browser.close();
console.log("done");
