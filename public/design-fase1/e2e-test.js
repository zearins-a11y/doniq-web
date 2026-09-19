#!/usr/bin/env node
/**
 * Auto-teste E2E do prototipo-navegavel.html
 * Usa Puppeteer para renderizar o protótipo em Chromium real
 * e validar comportamento de interação + estado do DOM.
 *
 * IMPORTANTE: Este teste requer Chromium baixado e compatível com a
 * arquitetura do sistema. Em Mac (darwin-x64 ou darwin-arm64), basta
 * rodar `npm install puppeteer` que o binário correto é baixado.
 *
 * Em alguns sandboxes Linux ARM o binário baixado é linux_arm (32-bit)
 * e não roda em ARM64 sem camada qemu-user — se for o caso, rode este
 * teste localmente no seu Mac.
 *
 * Requer: `npm install puppeteer` no diretório do projeto
 * Uso: node e2e-test.js [path-to-prototipo]
 */

import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const FILE = process.argv[2] || "./prototipo-navegavel.html";
const absPath = resolve(FILE);

if (!existsSync(absPath)) {
  console.error(`✗ Arquivo não encontrado: ${absPath}`);
  process.exit(1);
}

// Verifica se puppeteer tem binário compatível
try {
  const browserFetcher = puppeteer._launcher || puppeteer;
  const execPath = browserFetcher.executablePath?.() || "";
  if (!execPath || !existsSync(execPath)) {
    console.error(`✗ Puppeteer não encontrou um binário compatível.`);
    console.error(`  Rode: npm install puppeteer`);
    process.exit(1);
  }
} catch (e) {
  console.error(`✗ Erro verificando binário: ${e.message}`);
  process.exit(1);
}

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, detail = "") {
  console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? `  ${detail}` : ""}`);
  pass++;
}
function bad(name, detail = "") {
  console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `  ${detail}` : ""}`);
  fail++;
  failures.push(`${name} — ${detail}`);
}

console.log(`\x1b[1m\x1b[34m▌\x1b[0m E2E test · ${FILE}\n`);

const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 900, deviceScaleFactor: 1 });

const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(err.message));
page.on("requestfailed", (req) => {
  // Ignora falha de favicon.ico (não impacta o app)
  if (!req.url().includes("favicon")) {
    requestFailures.push(`${req.url()} — ${req.failure()?.errorText}`);
  }
});

const fileUrl = `file://${absPath}`;

/* ──────────────────────────────────────────────────────────────
   Carregar página
   ────────────────────────────────────────────────────────────── */
console.log("\x1b[1m\x1b[34m▌\x1b[0m Carregando...\n");

try {
  await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 15000 });
  ok("Página carregou", `${(absPath.length / 1024).toFixed(1)}KB`);
} catch (e) {
  bad("Página carregou", e.message);
  await browser.close();
  process.exit(1);
}

// Espera animações terminarem
await new Promise((r) => setTimeout(r, 500));

/* ──────────────────────────────────────────────────────────────
   1. Sem erros no console / page
   ────────────────────────────────────────────────────────────── */
if (consoleErrors.length === 0) ok("Console limpo", "0 erros");
else bad("Console limpo", `${consoleErrors.length} erros: ${consoleErrors[0]}`);

if (pageErrors.length === 0) ok("Sem erros de página", "0 uncaught");
else bad("Sem erros de página", pageErrors.join("; "));

/* ──────────────────────────────────────────────────────────────
   2. Recursos externos carregaram (GSAP via CDN)
   ────────────────────────────────────────────────────────────── */
const gsapLoaded = await page.evaluate(() => typeof window.gsap !== "undefined");
if (gsapLoaded) ok("GSAP carregou via CDN", "window.gsap definido");
else bad("GSAP carregou via CDN", "window.gsap indefinido");

/* ──────────────────────────────────────────────────────────────
   3. 5 telas existem no DOM (não apenas escondidas)
   ────────────────────────────────────────────────────────────── */
const screenNames = ["welcome", "home", "rec", "proc", "done"];
const screenResults = await page.evaluate((names) => {
  return names.map((n) => ({
    name: n,
    exists: !!document.querySelector(`.screen[data-name="${n}"]`),
    visible: document.querySelector(`.screen.active`)?.dataset?.name === n,
  }));
}, screenNames);

const existing = screenResults.filter((s) => s.exists).map((s) => s.name);
if (existing.length === 5) ok("5 telas no DOM", existing.join(" · "));
else bad("5 telas no DOM", `apenas ${existing.length}: ${existing.join(", ")}`);

/* ──────────────────────────────────────────────────────────────
   4. Welcome é a tela inicial ativa
   ────────────────────────────────────────────────────────────── */
const initialActive = await page.evaluate(
  () => document.querySelector(".screen.active")?.dataset?.name
);
if (initialActive === "welcome") ok("Tela inicial Welcome");
else bad("Tela inicial Welcome", `ativo: ${initialActive}`);

/* ──────────────────────────────────────────────────────────────
   5. Cliques nos botões mudam de tela
   ────────────────────────────────────────────────────────────── */
async function clickAndCheck(screenName, buttonSelector) {
  await page.click(buttonSelector);
  await new Promise((r) => setTimeout(r, 400)); // espera transição
  const active = await page.evaluate(
    () => document.querySelector(".screen.active")?.dataset?.name
  );
  if (active === screenName) ok(`Click → ${screenName}`);
  else bad(`Click → ${screenName}`, `ativo: ${active}`);
}

await clickAndCheck("home", "button[data-screen='home']");
await clickAndCheck("rec", "button[data-screen='rec']");
await clickAndCheck("proc", "button[data-screen='proc']");
await clickAndCheck("done", "button[data-screen='done']");
await clickAndCheck("welcome", "button[data-screen='welcome']");

/* ──────────────────────────────────────────────────────────────
   6. FAB dentro do frame navega para Recording
   ────────────────────────────────────────────────────────────── */
await page.click("button[data-screen='home']");
await new Promise((r) => setTimeout(r, 400));
const fabExists = await page.$(".fab");
if (fabExists) {
  await page.click(".fab");
  await new Promise((r) => setTimeout(r, 400));
  const afterFab = await page.evaluate(
    () => document.querySelector(".screen.active")?.dataset?.name
  );
  if (afterFab === "rec") ok("FAB → tela Recording");
  else bad("FAB → tela Recording", `ativo: ${afterFab}`);
} else {
  bad("FAB → tela Recording", "FAB não encontrado");
}

/* ──────────────────────────────────────────────────────────────
   7. Stop-btn dentro da tela Recording navega para Processing
   ────────────────────────────────────────────────────────────── */
const stopExists = await page.$(".stop-btn");
if (stopExists) {
  await page.click(".stop-btn");
  await new Promise((r) => setTimeout(r, 400));
  const afterStop = await page.evaluate(
    () => document.querySelector(".screen.active")?.dataset?.name
  );
  if (afterStop === "proc") ok("Stop-btn → tela Processing");
  else bad("Stop-btn → tela Processing", `ativo: ${afterStop}`);
} else {
  bad("Stop-btn → tela Processing", "stop-btn não encontrado");
}

/* ──────────────────────────────────────────────────────────────
   8. Done state executa gsap na flowline (DOM mutation)
   ────────────────────────────────────────────────────────────── */
await page.click("button[data-screen='done']");
await new Promise((r) => setTimeout(r, 1500)); // espera gsap animar

const doneFlowWidth = await page.evaluate(() => {
  const fill = document.querySelector("#doneFill");
  return fill ? fill.style.width || getComputedStyle(fill).width : null;
});
if (doneFlowWidth === "100%" || doneFlowWidth === "100.00%") {
  ok("GSAP animou flowline para 100%", `width: ${doneFlowWidth}`);
} else {
  bad("GSAP animou flowline para 100%", `width atual: ${doneFlowWidth}`);
}

/* ──────────────────────────────────────────────────────────────
   9. Mesh some no Done (Mariana)
   ────────────────────────────────────────────────────────────── */
const meshHidden = await page.evaluate(() => {
  const mesh = document.getElementById("mesh");
  return mesh ? parseFloat(getComputedStyle(mesh).opacity) < 0.5 : false;
});
if (meshHidden) ok("Mesh oculta no Done", `opacity < 0.5`);
else bad("Mesh oculta no Done", `opacity visível`);

/* ──────────────────────────────────────────────────────────────
   10. Recursos externos carregaram sem falha
   ────────────────────────────────────────────────────────────── */
if (requestFailures.length === 0) ok("Recursos externos OK", "0 falhas");
else bad("Recursos externos OK", requestFailures.join("; "));

/* ──────────────────────────────────────────────────────────────
   Cleanup
   ────────────────────────────────────────────────────────────── */
await browser.close();

console.log("");
if (fail === 0) {
  console.log(`\x1b[1m\x1b[32m▌\x1b[0m Todos os ${pass} checks passaram ✅\n`);
  process.exit(0);
} else {
  console.log(`\x1b[1m\x1b[31m▌\x1b[0m ${fail} check(s) falharam ❌\n`);
  failures.forEach((f) => console.log(`    ${f}`));
  console.log("");
  process.exit(1);
}
