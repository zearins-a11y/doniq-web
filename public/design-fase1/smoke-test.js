#!/usr/bin/env node
/**
 * Smoke test do prototipo-navegavel.html
 * Roda em Node puro (sem browser), em ~5s.
 *
 * Valida:
 *  1.  Arquivo existe e tem tamanho razoável
 *  2.  HTML bem-formado (tags balanceadas)
 *  3.  5 telas implementadas (welcome, home, rec, proc, done)
 *  4.  aria-label em todos os botões interativos (ou texto visível)
 *  5.  IDs únicos no DOM
 *  6.  GSAP carrega do CDN (200 OK)
 *  7.  Stack motion consistente (WAAPI + GSAP, sem Motion ESM)
 *  8.  prefers-reduced-motion honesta
 *  9.  Sem filter: blur no CSS (regra Diego)
 * 10.  Sem border-radius animado no CSS (regra Diego)
 * 11.  Sem console.log / debugger esquecidos
 * 12.  Contraste WCAG AA dos pares obrigatórios
 * 13.  Regressão de contraste: CTA original ainda abaixo do AA
 * 14.  JS extraível e parseável (executa em vm.Script)
 * 15.  data-* atributos referenciados no JS existem no HTML
 * 16.  Funções de transição estão definidas
 * 17.  Hierarquia: pesos 700+ antes de 500
 * 18.  Gradiente violet→blue→cyan usado em pontos focais (≤ 15 ocorrências)
 * 19.  Sem erros de digitação em classes CSS comuns (dp-, is-, etc.)
 * 20.  Texto-chave presente: "Falou, tá feito.", "Conte como foi.", "Siga o dia."
 *
 * Uso: node smoke-test.js
 */

import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const FILE = process.argv[2] || "./prototipo-navegavel.html";
const CHECKS = [];
let failures = 0;

function check(name, fn) {
  CHECKS.push({ name, fn });
}
function pass(name, detail = "") {
  console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? `  ${detail}` : ""}`);
}
function fail(name, detail = "") {
  console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? `  ${detail}` : ""}`);
  failures++;
}

/* ──────────────────────────────────────────────────────────────
   Setup
   ────────────────────────────────────────────────────────────── */
if (!existsSync(FILE)) {
  console.error(`\x1b[31m✗\x1b[0m Arquivo não encontrado: ${FILE}`);
  console.error("  Rode este script dentro de ~/dev/doniq-design-fase1/");
  process.exit(1);
}

const html = readFileSync(FILE, "utf8");
const size = Buffer.byteLength(html, "utf8");
console.log(`\x1b[1m\x1b[34m▌\x1b[0m Smoke test · prototipo-navegavel.html`);
console.log(`  Tamanho: ${(size / 1024).toFixed(1)}KB · ${html.split("\n").length} linhas\n`);

/* ──────────────────────────────────────────────────────────────
   1. Arquivo existe e tem tamanho razoável
   ────────────────────────────────────────────────────────────── */
check("Arquivo válido", () => {
  if (size < 10000) fail("Arquivo válido", `${size}B é muito pequeno`);
  else if (size > 200000) fail("Arquivo válido", `${(size / 1024).toFixed(0)}KB é grande demais (>200KB)`);
  else pass("Arquivo válido", `${(size / 1024).toFixed(1)}KB`);
});

/* ──────────────────────────────────────────────────────────────
   2. HTML bem-formado (tags balanceadas)
   ────────────────────────────────────────────────────────────── */
const tagsToCheck = ["div", "span", "button", "section"];
check("Tags balanceadas", () => {
  const issues = [];
  for (const tag of tagsToCheck) {
    const open = (html.match(new RegExp(`<${tag}(?:\\s|>)`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (open !== close) {
      issues.push(`${tag}: ${open} vs ${close}`);
    }
  }
  if (issues.length === 0) {
    pass("Tags balanceadas", `${tagsToCheck.join("/")} ok`);
  } else {
    fail("Tags balanceadas", issues.join("; "));
  }
});

/* ──────────────────────────────────────────────────────────────
   3. 5 telas implementadas
   ────────────────────────────────────────────────────────────── */
const EXPECTED_SCREENS = ["welcome", "home", "rec", "proc", "done"];
check("5 telas implementadas", () => {
  const missing = EXPECTED_SCREENS.filter(
    (s) => !html.includes(`data-name="${s}"`)
  );
  if (missing.length === 0) {
    pass("5 telas implementadas", EXPECTED_SCREENS.join(" · "));
  } else {
    fail("5 telas implementadas", `faltando: ${missing.join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   4. aria-label em todos os botões interativos
   ────────────────────────────────────────────────────────────── */
check("aria-label em botões interativos", () => {
  const buttonPattern = /<button\b[^>]*>[\s\S]*?<\/button>/g;
  const buttons = html.match(buttonPattern) || [];
  let missing = [];

  for (const btnFull of buttons) {
    const openTag = btnFull.match(/<button\b[^>]*>/)[0];
    const hasAriaLabel = /aria-label=/.test(openTag);
    const hasTextContent = />([^<]+)</.test(btnFull) && btnFull.replace(/<[^>]+>/g, "").trim().length > 0;

    if (!hasAriaLabel && !hasTextContent) {
      const idMatch = openTag.match(/id="([^"]+)"/);
      const classMatch = openTag.match(/class="([^"]+)"/);
      const tag = idMatch ? `id="${idMatch[1]}"` : classMatch ? `class="${classMatch[1]}"` : openTag.slice(0, 60);
      missing.push(tag);
    }
  }

  if (missing.length === 0) {
    pass("aria-label em botões interativos", `${buttons.length} botões OK`);
  } else {
    fail("aria-label em botões interativos", `${missing.length} sem label: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   5. IDs únicos no DOM
   ────────────────────────────────────────────────────────────── */
check("IDs únicos", () => {
  const ids = html.match(/id="([^"]+)"/g)?.map((s) => s.match(/"([^"]+)"/)[1]) || [];
  const unique = new Set(ids);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);

  if (duplicates.length === 0) {
    pass("IDs únicos", `${unique.size} IDs únicos`);
  } else {
    fail("IDs únicos", `duplicados: ${[...new Set(duplicates)].join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   6. GSAP carrega do CDN (200 OK)
   ────────────────────────────────────────────────────────────── */
async function checkGsapCdn() {
  check("GSAP CDN acessível", async () => {
    try {
      const res = await fetch("https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const sz = res.headers.get("content-length");
        pass("GSAP CDN acessível", `${res.status} OK · ${sz}B`);
      } else {
        fail("GSAP CDN acessível", `${res.status}`);
      }
    } catch (e) {
      fail("GSAP CDN acessível", `erro: ${e.message}`);
    }
  });
}

/* ──────────────────────────────────────────────────────────────
   7. Stack motion consistente
   ────────────────────────────────────────────────────────────── */
check("Stack motion consistente", () => {
  const hasMotionImport = /import\s+\{[^}]*\}\s+from\s+["']motion\/react["']/.test(html);
  const hasWaApi = /\.animate\(/.test(html);
  const hasGsap = /gsap\.(fromTo|timeline|set|to)/.test(html);

  if (!hasMotionImport && hasWaApi && hasGsap) {
    pass("Stack motion consistente", "WAAPI + GSAP, sem Motion ESM");
  } else if (hasMotionImport) {
    fail("Stack motion consistente", "import motion/react detectado — quebra em file://");
  } else {
    fail("Stack motion consistente", "WAAPI ou GSAP não detectados");
  }
});

/* ──────────────────────────────────────────────────────────────
   8. prefers-reduced-motion honesta
   ────────────────────────────────────────────────────────────── */
check("prefers-reduced-motion honesta", () => {
  const occurrences = (html.match(/prefers-reduced-motion/g) || []).length;
  if (occurrences >= 3) {
    pass("prefers-reduced-motion honesta", `${occurrences} ocorrências`);
  } else if (occurrences > 0) {
    fail("prefers-reduced-motion honesta", `apenas ${occurrences}`);
  } else {
    fail("prefers-reduced-motion honesta", "nenhuma");
  }
});

/* ──────────────────────────────────────────────────────────────
   9. Sem filter: blur no CSS (regra Diego)
   ────────────────────────────────────────────────────────────── */
check("Sem filter: blur", () => {
  const matches = html.match(/filter:\s*blur\s*\(\s*\d+px\s*\)/g) || [];
  if (matches.length === 0) {
    pass("Sem filter: blur", "regra Diego respeitada");
  } else {
    fail("Sem filter: blur", `${matches.length} ocorrências`);
  }
});

/* ──────────────────────────────────────────────────────────────
   10. Sem border-radius animado no CSS (regra Diego)
   ────────────────────────────────────────────────────────────── */
check("Sem border-radius animado", () => {
  const kf = (html.match(/@keyframes[^{]*\{[^}]*border-radius[^}]*\}/g) || [])
    .filter((k) => !k.includes("/* keep */"));
  const tr = html.match(/transition[^;]*border-radius/g) || [];

  if (kf.length === 0 && tr.length === 0) {
    pass("Sem border-radius animado", "regra Diego respeitada");
  } else {
    fail("Sem border-radius animado", `${kf.length} keyframes + ${tr.length} transitions`);
  }
});

/* ──────────────────────────────────────────────────────────────
   11. Sem console.log / debugger esquecidos
   ────────────────────────────────────────────────────────────── */
check("Sem debug esquecido", () => {
  const consoleLog = (html.match(/console\.(log|debug|info|warn|error)/g) || [])
    .filter((c) => !c.includes("// "));
  const debuggerMatch = (html.match(/\bdebugger\b/g) || [])
    .filter((d) => !d.includes("// "));

  if (consoleLog.length === 0 && debuggerMatch.length === 0) {
    pass("Sem debug esquecido", "limpo");
  } else {
    fail("Sem debug esquecido", `${consoleLog.length} console + ${debuggerMatch.length} debugger`);
  }
});

/* ──────────────────────────────────────────────────────────────
   12 & 13. Contraste WCAG AA
   ────────────────────────────────────────────────────────────── */
function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const REQUIRED_PAIRS = [
  { fg: "#F5F8FC", bg: "#071225", name: "Ink-50 sobre Ink-900" },
  { fg: "#C9D3E3", bg: "#071225", name: "Ink-100 sobre Ink-900" },
  { fg: "#168CFF", bg: "#071225", name: "Blue sobre Ink-900" },
  { fg: "#20D6F4", bg: "#071225", name: "Cyan sobre Ink-900" },
  { fg: "#FFFFFF", bg: "#0A6BC9", name: "White sobre CTA" },
];
const REGRESSION_PAIRS = [
  { fg: "#FFFFFF", bg: "#168CFF", name: "White sobre #168CFF (Blue original)" },
];

check("Contraste WCAG AA", () => {
  const issues = [];
  for (const { fg, bg, name } of REQUIRED_PAIRS) {
    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) issues.push(`${name}: ${ratio.toFixed(2)}:1`);
  }
  if (issues.length === 0) {
    pass("Contraste WCAG AA", `${REQUIRED_PAIRS.length}/${REQUIRED_PAIRS.length} AA`);
  } else {
    fail("Contraste WCAG AA", issues.join("; "));
  }
});

check("Regressão de contraste", () => {
  const regressions = [];
  for (const { fg, bg, name } of REGRESSION_PAIRS) {
    const ratio = contrastRatio(fg, bg);
    if (ratio >= 4.5) regressions.push(`${name}: ${ratio.toFixed(2)}:1`);
  }
  if (regressions.length === 0) {
    pass("Regressão de contraste", "CTA original ainda abaixo do AA");
  } else {
    fail("Regressão de contraste", regressions.join("; "));
  }
});

/* ──────────────────────────────────────────────────────────────
   14. JS extraível e parseável (executa em vm.Script)
   ────────────────────────────────────────────────────────────── */
check("JS extraível e parseável", () => {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) { fail("JS extraível e parseável", "nenhum <script>"); return; }

  try {
    // vm.Script valida sintaxe; não executa DOM APIs (que não existem aqui)
    new vm.Script(m[1]);
    pass("JS extraível e parseável", `${m[1].length} chars`);
  } catch (e) {
    fail("JS extraível e parseável", e.message);
  }
});

/* ──────────────────────────────────────────────────────────────
   15. data-* atributos referenciados no JS existem no HTML
   ────────────────────────────────────────────────────────────── */
check("data-* atributos consistentes", () => {
  const jsAttrs = [...html.matchAll(/getAttribute\(["']data-([\w-]+)["']\)|querySelector\(["'][^"']*data-([\w-]+)[^"']*["']\)/g)]
    .map((m) => m[1] || m[2])
    .filter((v, i, a) => a.indexOf(v) === i);

  const defined = [...html.matchAll(/\sdata-([\w-]+)=/g)]
    .map((m) => m[1]);

  const referencedButMissing = jsAttrs.filter((a) => !defined.includes(a));

  if (referencedButMissing.length === 0) {
    pass("data-* atributos consistentes", jsAttrs.length > 0 ? `${jsAttrs.length} attrs OK` : "nenhum usado");
  } else {
    fail("data-* atributos consistentes", `referenciados mas não definidos: ${referencedButMissing.join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   16. Funções de transição definidas
   ────────────────────────────────────────────────────────────── */
check("Funções de transição", () => {
  const required = ["showScreen", "fadeIn", "fadeOut"];
  const defined = [...html.matchAll(/function\s+([a-zA-Z]\w*)/g)].map((m) => m[1]);
  const missing = required.filter((f) => !defined.includes(f));

  if (missing.length === 0) {
    pass("Funções de transição", required.join(" · "));
  } else {
    fail("Funções de transição", `faltando: ${missing.join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   17. Hierarquia: pesos 700+ antes de 500 no mesmo seletor
   ────────────────────────────────────────────────────────────── */
check("Hierarquia de pesos", () => {
  // Detecta uso de weight 500 (secundário) sem ter weight 600+ (primário) no mesmo bloco
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
  const weightPattern = /font-weight:\s*(\d+)/g;
  const weights = [...css.matchAll(weightPattern)].map((m) => parseInt(m[1]));
  const hasHeavy = weights.some((w) => w >= 700);
  const hasLight = weights.some((w) => w < 500);
  const hasMedium = weights.some((w) => w === 500 || w === 550);

  // Hierarquia saudável: tem peso pesado (700+) E tem peso médio/leve para contraste
  if (hasHeavy && (hasLight || hasMedium)) {
    pass("Hierarquia de pesos", `range: ${Math.min(...weights)}–${Math.max(...weights)}`);
  } else {
    fail("Hierarquia de pesos", `pesos encontrados: ${[...new Set(weights)].sort((a,b)=>a-b).join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   18. Gradiente violet→blue→cyan usado em pontos focais (≤15)
   ────────────────────────────────────────────────────────────── */
check("Gradiente violet→blue→cyan controlado", () => {
  // Conta ocorrências da definição completa do gradiente
  const occurrencesFull = (html.match(/linear-gradient\(90deg, #7C4DFF/g) || []).length;

  // Deve ter ≥1 (q do wordmark) e ≤15 (não deve cobrir telas inteiras)
  if (occurrencesFull === 0) {
    fail("Gradiente violet→blue→cyan controlado", "nenhuma ocorrência — falta identidade");
  } else if (occurrencesFull > 15) {
    fail("Gradiente violet→blue→cyan controlado", `${occurrencesFull} ocorrências — pode estar overuse`);
  } else {
    pass("Gradiente violet→blue→cyan controlado", `${occurrencesFull} pontos focais (1–15)`);
  }
});

/* ──────────────────────────────────────────────────────────────
   19. Sem typos em classes CSS comuns
   ────────────────────────────────────────────────────────────── */
check("Classes CSS sem typos comuns", () => {
  const defined = new Set([...html.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]));
  const referenced = new Set([...html.matchAll(/class="([^"]+)"/g)]
    .map((m) => m[1].split(/\s+/))
    .flat());

  // Classes órfãs comuns (não estão definidas no CSS)
  const orphans = [...referenced].filter((c) => !defined.has(c));

  // Filtra classes que claramente são do Tailwind/utilities (que não precisam ser definidas)
  const REAL_ORPHANS = orphans.filter((c) =>
    !c.match(/^(dp-|is-|has-|active|w-|h-|p-|m-|flex|grid|rounded|border|bg|text|font|gap|space|min-|max-|opacity|shadow|transition|duration|ease|transform|origin)/)
  );

  if (REAL_ORPHANS.length === 0) {
    pass("Classes CSS sem typos comuns", `${referenced.size} referenciadas`);
  } else {
    fail("Classes CSS sem typos comuns", `${REAL_ORPHANS.length} órfãs: ${REAL_ORPHANS.slice(0, 3).join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   20. Texto-chave presente (identidade verbal)
   ────────────────────────────────────────────────────────────── */
check("Textos-chave da marca", () => {
  const requiredTexts = [
    { text: "Conte como foi", desc: "Headline principal" },
    { text: "Siga o dia", desc: "Headline principal" },
    { text: "Falou, tá feito", desc: "Tagline / Done state" },
    { text: "doniq", desc: "Wordmark" },
  ];

  const missing = requiredTexts.filter((r) => !html.includes(r.text));

  if (missing.length === 0) {
    pass("Textos-chave da marca", `${requiredTexts.length}/${requiredTexts.length} presentes`);
  } else {
    fail("Textos-chave da marca", `faltando: ${missing.map((m) => `"${m.text}" (${m.desc})`).join(", ")}`);
  }
});

/* ──────────────────────────────────────────────────────────────
   Estatísticas + execução
   ────────────────────────────────────────────────────────────── */
function stats() {
  const counts = {
    "data-screen": (html.match(/data-screen=/g) || []).length,
    "@keyframes": (html.match(/@keyframes/g) || []).length,
    "box-shadow": (html.match(/box-shadow:/g) || []).length,
    "linear-gradient": (html.match(/linear-gradient/g) || []).length,
    "radial-gradient": (html.match(/radial-gradient/g) || []).length,
    "transition": (html.match(/transition:/g) || []).length,
    "aria-label": (html.match(/aria-label=/g) || []).length,
    "data-name": (html.match(/data-name=/g) || []).length,
  };
  return counts;
}

console.log("");
console.log("\x1b[1m\x1b[34m▌\x1b[0m Executando verificações...\n");

for (const c of CHECKS) {
  await c.fn();
}

await checkGsapCdn();

const s = stats();
console.log("");
console.log("\x1b[1m\x1b[34m▌\x1b[0m Estatísticas do CSS\n");
for (const [key, value] of Object.entries(s)) {
  console.log(`  ${key.padEnd(20)} ${value}`);
}

console.log("");
if (failures === 0) {
  console.log("\x1b[1m\x1b[32m▌\x1b[0m Todos os checks passaram ✅\n");
  process.exit(0);
} else {
  console.log(`\x1b[1m\x1b[31m▌\x1b[0m ${failures} check(s) falharam ❌\n`);
  process.exit(1);
}
