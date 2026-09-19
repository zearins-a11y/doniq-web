#!/usr/bin/env node
/**
 * Runner · roda smoke-checks em todos os HTMLs do projeto
 * Saída: tabela consolidada + exit code agregado
 *
 * Uso: node smoke-all.js
 *      node smoke-all.js --quiet     # só mostra falhas
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { runChecks } from "./smoke-checks.js";

const ROOT = resolve("./");
const QUIET = process.argv.includes("--quiet");
const ONLY_FAIL = process.argv.includes("--only-fail");

/* Encontra todos os HTMLs (excluindo node_modules e arquivos de teste) */
function findHtmls(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) findHtmls(full, acc);
    else if (entry.endsWith(".html") && !entry.includes("test-")) acc.push(full);
  }
  return acc;
}

const htmls = findHtmls(ROOT).sort();

if (htmls.length === 0) {
  console.error("✗ Nenhum HTML encontrado em", ROOT);
  process.exit(1);
}

console.log(`\x1b[1m\x1b[34m▌\x1b[0m Smoke all · ${htmls.length} arquivos\n`);

const allResults = [];
let totalPass = 0;
let totalFail = 0;

for (const filePath of htmls) {
  const html = readFileSync(filePath, "utf8");
  const { results, stats, summary, profile } = await runChecks(html, filePath);
  const rel = relative(ROOT, filePath);
  allResults.push({ file: rel, profile, summary, stats, results });

  totalPass += summary.pass;
  totalFail += summary.fail;

  const icon = summary.fail === 0 ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  const summary_line = `${summary.pass}/${summary.total}`;

  if (QUIET && summary.fail === 0) continue;
  if (ONLY_FAIL && summary.fail === 0) continue;

  console.log(`${icon} \x1b[1m${rel}\x1b[0m  [${profile}]  ${summary_line}`);
  for (const r of results) {
    if (!r.ok) console.log(`    \x1b[31m✗\x1b[0m ${r.name}: ${r.detail}`);
  }
}

/* Estatísticas agregadas */
console.log(`\n\x1b[1m\x1b[34m▌\x1b[0m Resumo consolidado\n`);

const tableData = allResults.map((r) => ({
  file: r.file.padEnd(40),
  profile: r.profile.padEnd(8),
  pass: String(r.summary.pass).padStart(3),
  fail: String(r.summary.fail).padStart(3),
  size: r.stats.size.padStart(7),
  anim: String(r.stats["@keyframes"]).padStart(2),
}));
console.log("  " + "Arquivo".padEnd(40) + "Profile".padEnd(10) + "Pass".padEnd(5) + "Fail".padEnd(5) + "Size".padEnd(9) + "KFs");
console.log("  " + "-".repeat(78));
for (const row of tableData) {
  const failColor = parseInt(row.fail) > 0 ? "\x1b[31m" : "\x1b[32m";
  console.log(`  ${row.file}${row.profile}${row.pass}${failColor}${row.fail}\x1b[0m${row.size}   ${row.anim}`);
}

/* Comparação de complexidade entre versões */
console.log(`\n\x1b[1m\x1b[34m▌\x1b[0m Comparação de complexidade\n`);
const sorted = [...allResults].sort((a, b) => parseInt(b.stats.lines) - parseInt(a.stats.lines));
for (const r of sorted.slice(0, 5)) {
  console.log(`  ${String(r.stats.lines).padStart(5)} linhas  ·  ${r.file}`);
}

console.log("");
if (totalFail === 0) {
  console.log(`\x1b[1m\x1b[32m▌\x1b[0m Todos os arquivos passaram (${totalPass} checks totais) ✅\n`);
  process.exit(0);
} else {
  console.log(`\x1b[1m\x1b[31m▌\x1b[0m ${totalFail} checks falharam em ${allResults.filter(r => r.summary.fail > 0).length} arquivo(s) ❌\n`);
  process.exit(1);
}
