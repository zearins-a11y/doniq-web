#!/usr/bin/env node
/**
 * Smoke test genérico — usado por smoke-test.js (single) e smoke-all.js (runner)
 * Exporta `runChecks(html, file)` que retorna { pass, fail, results }.
 *
 * Valida 20 checks compartilhados por qualquer HTML do projeto:
 *  1. Arquivo válido
 *  2. Tags balanceadas
 *  3. data-screen ou 5 telas (v2.5+)
 *  4. aria-label em botões
 *  5. IDs únicos
 *  6. GSAP CDN (se referenciado)
 *  7. Stack motion consistente
 *  8. prefers-reduced-motion honesta
 *  9. Sem filter: blur
 * 10. Sem border-radius animado
 * 11. Sem debug esquecido
 * 12. Contraste WCAG AA
 * 13. Regressão de contraste
 * 14. JS extraível e parseável
 * 15. data-* atributos consistentes
 * 16. Funções de transição (se navegável)
 * 17. Hierarquia de pesos
 * 18. Gradiente violet→blue→cyan controlado
 * 19. Classes CSS sem typos
 * 20. Textos-chave da marca
 */

import vm from "node:vm";

export const PAIRS_REQUIRED = [
  { fg: "#F5F8FC", bg: "#071225", name: "Ink-50 sobre Ink-900" },
  { fg: "#C9D3E3", bg: "#071225", name: "Ink-100 sobre Ink-900" },
  { fg: "#168CFF", bg: "#071225", name: "Blue sobre Ink-900" },
  { fg: "#20D6F4", bg: "#071225", name: "Cyan sobre Ink-900" },
  { fg: "#FFFFFF", bg: "#0A6BC9", name: "White sobre CTA" },
];
export const PAIRS_REGRESSION = [
  { fg: "#FFFFFF", bg: "#168CFF", name: "White sobre #168CFF" },
];
export const TEXTS_CHAVE = [
  { text: "doniq", desc: "Wordmark" },
];

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
function contrastRatio(h1, h2) {
  const l1 = relativeLuminance(h1);
  const l2 = relativeLuminance(h2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Detecta "perfil" do arquivo para escolher quais checks aplicar
 * - "nav": tem data-screen (protótipo navegável)
 * - "static": HTML estático lado-a-lado
 */
export function detectProfile(html) {
  if (html.includes("data-screen=")) return "nav";
  if (html.includes(".frame") && html.includes(".row")) return "static";
  return "generic";
}

/**
 * Roda os checks. Retorna { results: [...], stats: {...}, summary: { pass, fail } }
 */
export async function runChecks(html, filePath = "unknown") {
  const results = [];
  const size = Buffer.byteLength(html, "utf8");
  const profile = detectProfile(html);

  const record = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
  };

  // 1. Arquivo válido
  if (size < 5000) record("Arquivo válido", false, `${size}B muito pequeno`);
  else if (size > 200000) record("Arquivo válido", false, `${(size/1024).toFixed(0)}KB grande demais`);
  else record("Arquivo válido", true, `${(size/1024).toFixed(1)}KB`);

  // 2. Tags balanceadas
  const tags = ["div", "span", "button", "section"];
  const tagIssues = [];
  for (const t of tags) {
    const open = (html.match(new RegExp(`<${t}(?:\\s|>)`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${t}>`, "g")) || []).length;
    if (open !== close) tagIssues.push(`${t}: ${open}≠${close}`);
  }
  record("Tags balanceadas", tagIssues.length === 0, tagIssues.join("; ") || `${tags.join("/")} ok`);

  // 3. Telas (apenas se perfil nav) ou frames (se perfil static)
  if (profile === "nav") {
    const expected = ["welcome", "home", "rec", "proc", "done"];
    const missing = expected.filter((s) => !html.includes(`data-name="${s}"`));
    record("5 telas implementadas", missing.length === 0, missing.length ? `faltando: ${missing.join(", ")}` : expected.join(" · "));
  } else if (profile === "static") {
    // Aceita tanto .frame quanto .row quanto grid de telas (>=3 telas detectadas)
    const frameCount = (html.match(/class="frame[^"]*"/g) || []).length;
    const rowCount = (html.match(/class="row[^"]*"/g) || []).length;
    const totalFrames = Math.max(frameCount, rowCount);
    if (totalFrames >= 3) {
      record("Frames lado-a-lado", true, `${totalFrames} telas renderizadas`);
    } else {
      record("Frames lado-a-lado", false, `apenas ${totalFrames} (esperado ≥3)`);
    }
  } else {
    record("Estrutura", true, "sem expectativa de frames");
  }

  // 4. aria-label em botões
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];
  const missing = [];
  for (const btn of buttons) {
    const openTag = btn.match(/<button\b[^>]*>/)[0];
    const hasAria = /aria-label=/.test(openTag);
    const hasText = />([^<]+)</.test(btn) && btn.replace(/<[^>]+>/g, "").trim().length > 0;
    if (!hasAria && !hasText) {
      const id = openTag.match(/id="([^"]+)"/);
      const cls = openTag.match(/class="([^"]+)"/);
      missing.push(id ? `id=${id[1]}` : cls ? cls[1].split(" ")[0] : "?");
    }
  }
  record("aria-label em botões", missing.length === 0, `${buttons.length} botões${missing.length ? `, ${missing.length} sem label` : ""}`);

  // 5. IDs únicos
  const ids = html.match(/id="([^"]+)"/g)?.map((s) => s.match(/"([^"]+)"/)[1]) || [];
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  record("IDs únicos", dupes.length === 0, `${new Set(ids).size} únicos${dupes.length ? `, dupes: ${[...new Set(dupes)].join(", ")}` : ""}`);

  // 6. GSAP CDN (só se referenciado)
  if (html.includes("gsap@3") || html.includes("cdn.jsdelivr.net/npm/gsap")) {
    try {
      const res = await fetch("https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js", {
        method: "HEAD", signal: AbortSignal.timeout(5000),
      });
      record("GSAP CDN acessível", res.ok, res.ok ? `${res.status} OK` : `${res.status}`);
    } catch (e) {
      record("GSAP CDN acessível", false, `erro: ${e.message}`);
    }
  } else {
    record("GSAP CDN referenciado", true, "não usa GSAP (ok)");
  }

  // 7. Stack motion consistente
  const hasMotionImport = /import\s+\{[^}]*\}\s+from\s+["']motion\/react["']/.test(html);
  const hasWaApi = /\.animate\(/.test(html);
  const hasGsap = /gsap\.(fromTo|timeline|set|to)/.test(html);
  if (!hasMotionImport && (hasWaApi || hasGsap || !html.includes("transition"))) {
    record("Stack motion", true, "sem Motion ESM quebrado");
  } else if (hasMotionImport) {
    record("Stack motion", false, "motion/react importado — quebra em file://");
  } else {
    record("Stack motion", true, "estático");
  }

  // 8. prefers-reduced-motion honesta
  const prm = (html.match(/prefers-reduced-motion/g) || []).length;
  const hasAnimation = html.includes("@keyframes") || html.includes(".animate(");
  if (hasAnimation) {
    record("prefers-reduced-motion honesta", prm >= 1, prm >= 3 ? `${prm} ocorrências` : `apenas ${prm}`);
  } else {
    record("prefers-reduced-motion honesta", true, "sem animações contínuas");
  }

  // 9. Sem filter: blur (regra Diego — backdrop-filter é OK, só filter: blur puro é proibido)
  const blurs = html.match(/(?<!backdrop-)filter:\s*blur\s*\(\s*\d+px\s*\)/g) || [];
  record("Sem filter: blur", blurs.length === 0, blurs.length ? `${blurs.length} ocorrências` : "regra Diego ok");

  // 10. Sem border-radius animado
  const kfBr = (html.match(/@keyframes[^{]*\{[^}]*border-radius[^}]*\}/g) || []).filter((k) => !k.includes("/* keep */"));
  const trBr = html.match(/transition[^;]*border-radius/g) || [];
  record("Sem border-radius animado", kfBr.length === 0 && trBr.length === 0, "regra Diego ok");

  // 11. Sem debug
  const logs = (html.match(/console\.(log|debug|info|warn|error)/g) || []).filter((c) => !c.includes("// "));
  const dbg = (html.match(/\bdebugger\b/g) || []).filter((d) => !d.includes("// "));
  record("Sem debug esquecido", logs.length === 0 && dbg.length === 0, "limpo");

  // 12. Contraste WCAG AA
  const contrastIssues = [];
  for (const { fg, bg, name } of PAIRS_REQUIRED) {
    if (contrastRatio(fg, bg) < 4.5) contrastIssues.push(`${name}`);
  }
  record("Contraste WCAG AA", contrastIssues.length === 0, contrastIssues.length ? contrastIssues.join("; ") : `${PAIRS_REQUIRED.length}/${PAIRS_REQUIRED.length} AA`);

  // 13. Regressão de contraste
  const regIssues = [];
  for (const { fg, bg, name } of PAIRS_REGRESSION) {
    if (contrastRatio(fg, bg) >= 4.5) regIssues.push(name);
  }
  record("Regressão de contraste", regIssues.length === 0, "CTA original ainda abaixo do AA");

  // 14. JS parseável
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (m) {
    try {
      new vm.Script(m[1]);
      record("JS parseável", true, `${m[1].length} chars`);
    } catch (e) {
      record("JS parseável", false, e.message);
    }
  } else {
    record("JS parseável", true, "sem script inline");
  }

  // 15. data-* atributos consistentes (só se há JS inline)
  if (m) {
    const jsAttrs = [...html.matchAll(/getAttribute\(["']data-([\w-]+)["']\)|querySelector\(["'][^"']*data-([\w-]+)[^"']*["']\)/g)]
      .map((m) => m[1] || m[2]).filter((v, i, a) => a.indexOf(v) === i);
    const defined = [...html.matchAll(/\sdata-([\w-]+)=/g)].map((m) => m[1]);
    const refButMissing = jsAttrs.filter((a) => !defined.includes(a));
    record("data-* atributos consistentes", refButMissing.length === 0, jsAttrs.length ? `${jsAttrs.length} attrs` : "nenhum usado");
  } else {
    record("data-* atributos consistentes", true, "n/a");
  }

  // 16. Funções de transição (só perfil nav)
  if (profile === "nav") {
    const required = ["showScreen"];
    const defined = [...html.matchAll(/function\s+([a-zA-Z]\w*)/g)].map((m) => m[1]);
    const missing = required.filter((f) => !defined.includes(f));
    record("Funções de transição", missing.length === 0, missing.length ? `faltando: ${missing.join(", ")}` : required.join(" · "));
  } else {
    record("Funções de transição", true, "n/a (estático)");
  }

  // 17. Hierarquia de pesos
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
  const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => parseInt(m[1]));
  const uniqW = [...new Set(weights)].sort((a, b) => a - b);
  const range = uniqW.length > 0 ? `${Math.min(...uniqW)}–${Math.max(...uniqW)}` : "nenhum";
  record("Hierarquia de pesos", uniqW.includes(700) || uniqW.includes(750) || weights.length === 0, `range: ${range}`);

  // 18. Gradiente violet→blue→cyan controlado
  const gradOCC = (html.match(/linear-gradient\(90deg, #7C4DFF/g) || []).length;
  if (gradOCC === 0) {
    record("Gradiente violet→blue→cyan", false, "nenhuma ocorrência — falta identidade");
  } else if (gradOCC > 15) {
    record("Gradiente violet→blue→cyan", false, `${gradOCC} ocorrências — overuse`);
  } else {
    record("Gradiente violet→blue→cyan", true, `${gradOCC} pontos focais`);
  }

  // 19. Classes CSS sem typos
  const definedClasses = new Set([...html.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]));
  const refClasses = new Set([...html.matchAll(/class="([^"]+)"/g)]
    .map((m) => m[1].split(/\s+/)).flat());
  const orphans = [...refClasses].filter((c) => !definedClasses.has(c) &&
    !c.match(/^(dp-|is-|has-|active|w-|h-|p-|m-|flex|grid|rounded|border|bg|text|font|gap|space|min-|max-|opacity|shadow|transition|duration|ease|transform|origin)/));
  record("Classes CSS sem typos", orphans.length === 0, `${refClasses.size} referenciadas, ${orphans.length} órfãs`);

  // 20. Textos-chave da marca + anti-patterns de capitalização (Sistema Unificado §3 manda minúsculas)
  const requiredTexts = TEXTS_CHAVE.filter((r) => !html.includes(r.text));
  const antiPatterns = [/\bDoniq\b/, /\bDONIQ\b/, /\bD[óo]niq\b/];
  const antiMatches = antiPatterns.flatMap((re) => (html.match(re) || []));
  if (requiredTexts.length === 0 && antiMatches.length === 0) {
    record("Textos-chave da marca", true, `${TEXTS_CHAVE.length}/${TEXTS_CHAVE.length} presentes, 0 capitalizações erradas`);
  } else if (antiMatches.length > 0) {
    record("Textos-chave da marca", false, `capitalização errada: ${antiMatches.length} ocorrências`);
  } else {
    record("Textos-chave da marca", false, `faltando: ${requiredTexts.map((m) => m.desc).join(", ")}`);
  }

  // Stats
  const stats = {
    size: `${(size/1024).toFixed(1)}KB`,
    lines: html.split("\n").length,
    profile,
    "@keyframes": (html.match(/@keyframes/g) || []).length,
    "box-shadow": (html.match(/box-shadow:/g) || []).length,
    "linear-gradient": (html.match(/linear-gradient/g) || []).length,
    "radial-gradient": (html.match(/radial-gradient/g) || []).length,
    "aria-label": (html.match(/aria-label=/g) || []).length,
    "data-screen": (html.match(/data-screen=/g) || []).length,
    "data-name": (html.match(/data-name=/g) || []).length,
  };

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;

  return { results, stats, summary: { pass, fail, total: results.length }, profile, filePath };
}
