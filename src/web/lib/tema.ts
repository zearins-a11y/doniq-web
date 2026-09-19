/**
 * Tema claro/escuro. Três estados: "sistema" (padrão), "claro" e "escuro".
 * A escolha explícita vira `data-tema` no <html>, que o tokens.css usa para
 * sobrepor o `prefers-color-scheme`. Fica no localStorage para sobreviver ao
 * recarregamento.
 */

export type Tema = "sistema" | "claro" | "escuro";

const CHAVE = "relato_tema";

/** Cor da barra do navegador em cada tema — precisa casar com `--papel`. */
const COR_BARRA: Record<"claro" | "escuro", string> = {
  claro: "#F5F8FC",
  escuro: "#030817",
};

export function temaSalvo(): Tema {
  if (typeof localStorage === "undefined") return "sistema";
  const valor = localStorage.getItem(CHAVE);
  return valor === "claro" || valor === "escuro" ? valor : "sistema";
}

export function sistemaEscuro(): boolean {
  if (typeof matchMedia === "undefined") return false;
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

/** O tema que está de fato na tela, já resolvendo "sistema". */
export function temaEfetivo(tema: Tema): "claro" | "escuro" {
  if (tema === "sistema") return sistemaEscuro() ? "escuro" : "claro";
  return tema;
}

/** Aplica no <html> e persiste. Chamado no boot e a cada troca. */
export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === "sistema") {
    raiz.removeAttribute("data-tema");
    localStorage.removeItem(CHAVE);
  } else {
    raiz.setAttribute("data-tema", tema);
    localStorage.setItem(CHAVE, tema);
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", COR_BARRA[temaEfetivo(tema)]);
}

/** Ordem do botão: segue o sistema -> claro -> escuro -> segue o sistema. */
export function proximoTema(tema: Tema): Tema {
  if (tema === "sistema") return "claro";
  if (tema === "claro") return "escuro";
  return "sistema";
}

export const ROTULO_TEMA: Record<Tema, string> = {
  sistema: "tema: automático",
  claro: "tema: claro",
  escuro: "tema: escuro",
};
