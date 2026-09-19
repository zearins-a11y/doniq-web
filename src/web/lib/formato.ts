/** Formatação de data e telefone no fuso do vendedor, não no do servidor. */

const TZ = "America/Sao_Paulo";
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function hojeISO(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function agoraHora(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function somarDias(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dataLegivel(iso: string, hoje = hojeISO()): string {
  if (!iso) return "";
  if (iso === hoje) return "hoje";
  if (iso === somarDias(hoje, 1)) return "amanhã";
  if (iso === somarDias(hoje, -1)) return "ontem";
  const [a, m, d] = iso.split("-");
  const dt = new Date(Date.UTC(+a, +m - 1, +d));
  return `${d}/${m} · ${DIAS[dt.getUTCDay()]}`;
}

export const soDigitos = (v: unknown) => String(v || "").replace(/\D/g, "");

export function linkWhatsApp(telefone: string, texto: string): string {
  const d = soDigitos(telefone);
  const num = d ? (d.startsWith("55") ? d : "55" + d) : "";
  return `https://wa.me/${num}?text=${encodeURIComponent(texto || "")}`;
}

interface RelatoCRM {
  empresa: string;
  contato: string;
  cargo: string;
  telefone: string;
  temperatura: string;
  resumo: string;
  objecao: string;
  proxima_acao: string;
  data_iso: string;
  hora: string;
  concorrentes?: string[];
  numeros?: string[];
}

export function blocoCRM(r: RelatoCRM): string {
  return [
    `Empresa: ${r.empresa || "—"}`,
    `Contato: ${r.contato || "—"}${r.cargo ? ` (${r.cargo})` : ""}${r.telefone ? ` · ${r.telefone}` : ""}`,
    `Temperatura: ${r.temperatura}`,
    `Resumo:\n${r.resumo || "—"}`,
    `Objeção: ${r.objecao || "—"}`,
    `Próxima ação: ${r.proxima_acao || "—"}`,
    `Quando: ${r.data_iso ? `${r.data_iso} ${r.hora}` : "a confirmar"}`,
    r.concorrentes?.length ? `Concorrentes: ${r.concorrentes.join(", ")}` : "",
    r.numeros?.length ? `Números: ${r.numeros.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}
