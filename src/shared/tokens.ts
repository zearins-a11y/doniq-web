/**
 * Fonte única dos tokens visuais — consumida pela web (via `tokens.css`, gerado
 * por `scripts/gerar-tokens-css.ts`) e pelo mobile (import direto em
 * `constants/theme.ts`, já que o React Native não lê CSS).
 *
 * Identidade: DONIQ (kit de marca `06_Assets/UI_UX/brand-ui/doniq-tokens.json`).
 * Inter em caixa mista, cantos discretos de 6–14px, superfícies quase brancas com
 * respiro largo, e o gradiente violeta → azul → ciano reservado à ação — nunca
 * como preenchimento dominante, conforme manda o Sistema de Marca.
 *
 * Claro é o padrão: o app é usado em pé, no sol, com pressa e uma mão. Tela
 * escura com glow é o pior caso sob luz direta. O ink navy da marca vive no
 * tema escuro, no splash e no marketing.
 *
 * Ergonomia acima do estilo: corpo de texto nunca abaixo de 15px, alvo de
 * toque de 48px.
 */

export type NomeToken =
  | "papel"
  | "via"
  | "superficie"
  | "tinta"
  | "tinta2"
  | "tinta3"
  | "acento"
  | "acentoTexto"
  | "carimbo"
  | "ocre"
  | "frio"
  | "violeta"
  | "linha"
  | "borda"
  | "ok"
  | "avisoFundo"
  | "alertaFundo"
  | "placeholder"
  | "grad1"
  | "grad2"
  | "grad3"
  | "foco"
  | "sombra"
  | "sombraForte";

export type Tema = Record<NomeToken, string>;

/**
 * Tema claro — o padrão. Base White/Soft Ice com texto Ink 900.
 * O acento é `#0969C9` (e não o Blue 500 `#168CFF`) porque o azul de marca
 * sobre branco fica em 3.0:1 e não passa no WCAG AA para texto.
 */
export const TEMA_CLARO: Tema = {
  papel: "#FBFBFD", // quase branco — fundo da página, respiro antes de cor
  via: "#FFFFFF", // superfície elevada: ficha, cartão, campo, nav
  superficie: "#F4F6FA", // superfície rebaixada dentro de um cartão branco
  tinta: "#071225", // Ink 900 — leitura longa
  tinta2: "#52637A", // Slate — texto secundário (subtítulo, apoio de leitura)
  tinta3: "#647089", // Slate claro — terceiro nível: rótulo, nota, metadado. 4.97:1 sobre branco
  // (era #7C8CA1, 3.3:1 — abaixo do WCAG AA 4.5:1; usado em rótulo de campo tipo
  // "NOME DA EQUIPE" e no nav ativo, não só em metadado decorativo)
  acento: "#0969C9", // ação, link e foco (AA sobre branco)
  acentoTexto: "#FFFFFF",
  carimbo: "#C2352B", // destrutivo, quente, objeção, confiança baixa
  ocre: "#8A6A16", // morna, "falta combinar"
  frio: "#0E7490", // fria — ciano rebaixado até passar em texto
  violeta: "#6D3BEB", // ênfase; só em texto grande ou ícone
  linha: "#ECEFF4", // fio interno — régua entre seções, hairline
  borda: "#DEE3EB",
  ok: "#0F7A52",
  avisoFundo: "#FFF8E7",
  alertaFundo: "#FDECEA",
  placeholder: "#7C8CA1",
  grad1: "#6D3BEB", // gradiente rebaixado: traço de ícone sobre superfície clara
  grad2: "#0969C9",
  grad3: "#0E7490",
  foco: "rgba(9,105,201,0.22)",
  sombra: "0 1px 2px rgba(7,18,37,0.04)", // hairline: a hierarquia vem do fio, não da sombra
  sombraForte: "0 6px 20px rgba(7,18,37,0.08)",
};

/** Tema escuro — v1.5 "O Repouso Contido". Paleta navy com mesh de gradiente. */
export const TEMA_ESCURO: Tema = {
  papel: "#02050B", // fundo da tela (era #030817)
  via: "#0E1A33", // superfície elevada — cards (era #0D1B33)
  superficie: "#071225", // superfície rebaixada (era #071225)
  tinta: "#F5F8FC", // texto principal (era #F8FAFC)
  tinta2: "#A4B0C7", // texto secundário (era #A9B7CA)
  tinta3: "#7A8AA8", // texto terciário (era #7E8FA6)
  acento: "#168CFF", // ação primária (era #3F9DFF)
  acentoTexto: "#FFFFFF",
  carimbo: "#E5484D", // destrutivo, quente (era #FF8A80)
  ocre: "#E8A547", // morna, atenção (era #F0B429)
  frio: "#20D6F4", // fria (era #20D6F4)
  violeta: "#7C4DFF", // violeta de marca (era #A78BFA)
  linha: "#152544", // régua entre seções (era #142945)
  borda: "#1E2F55", // borda de cards (era #29476E)
  ok: "#3DBA8C", // sucesso (era #34D399)
  avisoFundo: "rgba(232,165,71,0.12)", // fundo aviso (era #1B2130)
  alertaFundo: "rgba(229,72,77,0.12)", // fundo alerta (era #2A1A20)
  placeholder: "#2E4878",
  grad1: "#7C4DFF", // gradiente violeta
  grad2: "#168CFF", // gradiente azul
  grad3: "#20D6F4", // gradiente cian
  foco: "rgba(22,140,255,0.28)",
  sombra: "0 4px 12px rgba(22,140,255,0.12)", // sombra suave azul
  sombraForte: "0 12px 32px rgba(22,140,255,0.35)", // sombra forte
};

/**
 * Gradiente de marca. Sinal de ação e transformação — botão principal, orbe de
 * captura de voz e o `q` da marca. Nunca como fundo de tela inteira.
 */
export const GRADIENTE = {
  marca: ["#7C4DFF", "#168CFF", "#20D6F4"] as const,
  paradas: [0, 0.52, 1] as const,
  css: "linear-gradient(135deg, #7C4DFF 0%, #168CFF 52%, #20D6F4 100%)",
} as const;

/**
 * Variante rebaixada do gradiente, para traço de ícone e ilustração sobre
 * superfície clara — o gradiente puro fica abaixo de 3:1 sobre branco.
 * Exposto por tema em `--grad-1/2/3`, então o mesmo desenho serve nos dois.
 */
export const GRADIENTE_CLARO = {
  marca: ["#6D3BEB", "#0969C9", "#0E7490"] as const,
  css: "linear-gradient(135deg, #6D3BEB 0%, #0969C9 52%, #0E7490 100%)",
} as const;

/**
 * Raios de canto — v1.5 "O Repouso Contido":
 * - Cantos assimétricos nos vcards (22/14/14/14px)
 * - Pills para chips, FAB, progress bars
 * - Controls discretos em 8-14px
 */
export const RAIO = {
  selo: 6, // chip, tag, marcador miúdo
  controle: 8, // botão, campo, item de nav
  sm: 8,
  md: 14, // cards principais
  xl: 14, // cantos extras
  lg: 22, // vcard com cantos assimétricos
  pill: 999, // só para círculo e barra: ponto, progresso, trilha, chips, FAB
} as const;

/** Escala tipográfica. Corpo nunca abaixo de 15px — legibilidade em campo. */
export const FONTES = {
  titulo: "'Inter', system-ui, -apple-system, sans-serif",
  corpo: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

/**
 * Tamanhos de fonte, em px. Sem token, cada tela decidia o próprio número —
 * auditoria de 2026-08-18 achou 36 valores diferentes em styles.css, alguns
 * a 0.5px de distância um do outro (ajuste no olho, não decisão de design).
 *
 * `corpo` é o piso: nunca use algo abaixo dele para texto de leitura — é a
 * mesma regra que já vale para `FONTES`, agora com número para checar.
 * `micro`/`label` continuam existindo abaixo do piso de propósito: são para
 * selo, contador e rótulo de campo, não para o vendedor ler no sol.
 */
export const TIPO = {
  micro: 11, // selo, contador (1/6), mono uppercase muito pequeno
  label: 13, // rótulo de campo, meta-informação (contato · data), chip
  corpo: 15, // texto de leitura — piso do app, nunca abaixo disso
  destaque: 17, // subtítulo, ênfase dentro do corpo
  tituloSm: 20, // título de card, pergunta da tela
  titulo: 24, // título de tela (nome da empresa na ficha)
  tituloLg: 32, // KPI grande do painel, timer de gravação
  display: 40, // preço, número de destaque
  displayLg: 56, // hero da landing (combinar com clamp() para mobile)
} as const;

/** Alvo mínimo de toque, em px. Padrão de acessibilidade para uso com uma mão. */
export const TOQUE_MINIMO = 48;

/** Nome do token em CSS: `papel` -> `--papel`, `acentoTexto` -> `--acento-texto`. */
export function paraVariavelCss(nome: string): string {
  return `--${nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}`;
}
