/**
 * Headless smoke test: signs in, seeds a few transactions through the real UI
 * paths, then screenshots every page and reports console errors.
 *
 *   node scripts/smoke.mjs [baseUrl] [outDir]
 */
import { chromium } from "playwright-core";
import fs from "node:fs/promises";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "/tmp/td-shots";
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;

const PAGES = [
  "dashboard",
  "transactions",
  "wallets",
  "scan",
  "debts",
  "budgets",
  "goals",
  "bills",
  "analytics",
  "insight",
  "notifications",
  "menu",
  "settings",
];

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

/* ---------------------------------- login --------------------------------- */
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
// Form baru dirender setelah sesi selesai resolve (sebelum itu cuma spinner),
// jadi tunggu salah satu penanda form muncul dulu.
await page.waitForSelector('[role="tablist"], input[placeholder="Nama kamu siapa?"]', {
  timeout: 20_000,
});
// Saat env Supabase terisi, login default pindah ke tab "Pake Akun".
// Smoke selalu pakai mode lokal supaya tidak butuh kredensial.
const localTab = page.getByRole("tab", { name: "Offline Aja", exact: true });
if (await localTab.count()) await localTab.click();
await page.getByPlaceholder("Nama kamu siapa?").fill("Aan");
await shot("00-login");
await page.getByRole("button", { name: "Masuk" }).click();
await page.waitForURL("**/dashboard", { timeout: 20_000 });
await page.waitForTimeout(1200);

// Tutorial onboarding pertama kali muncul — lewati biar nggak nutupin UI.
const skipTutorial = page.getByRole("button", { name: "Lewati" });
if (await skipTutorial.count()) await skipTutorial.click();
await page.waitForTimeout(400);

/* ------------------------------- seed wallets ----------------------------- */
await page.goto(`${BASE}/wallets`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Dompet$/ }).first().click();
await page.getByPlaceholder("cth. BCA, GoPay, Dompet Tunai").fill("BCA");
await page.getByLabel("Saldo awal").fill("4500000");
await page.getByRole("button", { name: "Simpan" }).click();
await page.waitForTimeout(800);

/* ----------------------------- seed transactions -------------------------- */
const SEED = [
  { type: "Pengeluaran", amount: "45000", merchant: "Indomaret", day: -1 },
  { type: "Pengeluaran", amount: "150000", merchant: "Pertamina", day: -2 },
  { type: "Pengeluaran", amount: "89000", merchant: "GoFood", day: -3 },
  { type: "Pemasukan", amount: "8500000", merchant: "Gaji bulanan", day: -5 },
  { type: "Pengeluaran", amount: "320000", merchant: "Tokopedia", day: -6 },
  { type: "Pengeluaran", amount: "550000", merchant: "PLN", day: -8 },
];

for (const tx of SEED) {
  await page.getByRole("button", { name: "Catat transaksi" }).click();
  await page.getByRole("tab", { name: tx.type }).click();
  await page.getByPlaceholder("0").first().fill(tx.amount);
  await page.getByPlaceholder("cth. Indomaret").fill(tx.merchant);
  const d = new Date();
  d.setDate(d.getDate() + tx.day);
  await page.locator('input[type="date"]').fill(d.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Simpan" }).click();
  await page.waitForTimeout(600);
}

/* --------------------------------- budget --------------------------------- */
await page.goto(`${BASE}/budgets`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Budget$|Buat budget/ }).first().click();
await page.getByPlaceholder("cth. 1.500.000").fill("2000000");
await page.getByRole("button", { name: "Simpan" }).click();
await page.waitForTimeout(700);

/* ---------------------------------- goal ---------------------------------- */
await page.goto(`${BASE}/goals`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Target Baru|Target baru/ }).first().click();
await page.getByPlaceholder("cth. Dana Darurat").fill("Dana Darurat");
await page.getByPlaceholder("10.000.000").fill("20000000");
await page.getByPlaceholder("0").last().fill("6500000");
await page.getByRole("button", { name: "Simpan" }).click();
await page.waitForTimeout(700);

/* ---------------------------------- debt ---------------------------------- */
await page.goto(`${BASE}/debts`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Utang Piutang$/ }).first().click();
await page.getByPlaceholder("cth. Andi, Warung Bu Sari, Rani").fill("Rani");
await page.getByPlaceholder("0").first().fill("250000");
await page.getByRole("button", { name: "Simpan" }).click();
await page.waitForTimeout(700);

/* ---------------------------------- bill ---------------------------------- */
await page.goto(`${BASE}/bills`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Tagihan$|Tambah tagihan/ }).first().click();
await page.getByPlaceholder("cth. Listrik PLN").fill("Internet IndiHome");
await page.getByPlaceholder("0").first().fill("385000");
await page.getByRole("button", { name: "Simpan" }).click();
await page.waitForTimeout(700);

/* ---------------------------------- OCR ----------------------------------- */
// Exercises the real pipeline: downscale → preprocess → Tesseract → parser.
if (process.env.SKIP_OCR !== "1") {
  await page.goto(`${BASE}/scan`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.locator('input[type="file"]:not([capture])').setInputFiles("/tmp/receipt.png");
  try {
    await page.getByText("Hasil pembacaan").waitFor({ timeout: 180_000 });
    await page.waitForTimeout(800);
    await shot("05a-scan-result");
    const total = await page.getByLabel("Total").inputValue();
    const merchant = await page.getByLabel("Merchant").inputValue();
    const date = await page.getByLabel("Tanggal").inputValue();
    console.log(`OCR → merchant="${merchant}" total=${total} date=${date}`);
  } catch (err) {
    console.log("OCR did not finish:", err.message.split("\n")[0]);
    await shot("05a-scan-failed");
  }
}

/* ------------------------------ screenshot all ---------------------------- */
for (const [i, route] of PAGES.entries()) {
  await page.goto(`${BASE}/${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1400); // let charts finish their entry animation
  await shot(`${String(i + 1).padStart(2, "0")}-${route}`);
}

/* --------------------------------- mobile --------------------------------- */
// Same context so the seeded IndexedDB data is still there.
await page.setViewportSize({ width: 390, height: 844 });
for (const route of ["dashboard", "transactions", "analytics", "insight", "scan"]) {
  await page.goto(`${BASE}/${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/mobile-${route}.png`, fullPage: true });
}

await browser.close();

console.log(`screenshots → ${OUT}`);
if (errors.length) {
  console.log(`\n${errors.length} console/page errors:`);
  for (const e of [...new Set(errors)].slice(0, 20)) console.log(" -", e);
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
