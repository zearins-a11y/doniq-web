/**
 * Indicadores do painel do gestor — cálculo puro, sem banco e sem `new Date()`
 * escondido: quem chama passa o dia de referência. Isso deixa o teste mandar no
 * calendário em vez de o calendário mandar no teste.
 *
 * Só três indicadores, os que o dono do produto escolheu: visitas por período,
 * perguntas que faltaram e objeções mais frequentes. Nada de encher a tela com
 * gráfico que ninguém pediu.
 */

import {
  analisarObjecao,
  classificarCategoriaObjecao,
  obterPlaybookObjecao,
  type CategoriaObjecao,
} from "../relato/objecoes";
import { hojeBr, somarDias } from "../relato/tempo";

/** Entrada mínima. Recebe a ficha já filtrada pela allowlist do gestor. */
export type RelatoParaContagem = {
  user_id?: unknown;
  data_iso?: unknown;
  created_at?: unknown;
  objecao?: unknown;
  faltou_perguntar?: unknown;
  temperatura?: unknown;
};

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * O dia da visita é `created_at` — a hora em que o vendedor gravou a ficha, que é
 * logo depois da conversa.
 *
 * Cuidado que custou um bug: `data_iso` NÃO é a data da visita, é o prazo do
 * próximo passo ("mando a proposta na segunda"), portanto costuma estar no
 * futuro. Contar visita por `data_iso` fazia o painel mostrar zero visita na
 * semana logo depois de uma visita gravada hoje. Prazo é compromisso, não
 * histórico.
 */
export function diaDoRelato(r: RelatoParaContagem): string {
  const criado = texto(r.created_at);
  if (!/^\d{4}-\d{2}-\d{2}/.test(criado)) return "";
  // `created_at` é UTC; o gestor conta o dia no fuso do vendedor. Sem converter,
  // visita gravada às 22h de terça caía na quarta e o painel ficava um dia à
  // frente do calendário de quem trabalha.
  const d = new Date(criado);
  return Number.isNaN(d.getTime()) ? criado.slice(0, 10) : hojeBr(d);
}

/**
 * Contagem de visitas em janelas terminando em `hoje` (inclusive).
 * 7 e 30 dias porque é o que o gestor pergunta: "como foi a semana" e "como foi o mês".
 */
export function visitasPorPeriodo(
  relatos: RelatoParaContagem[],
  hoje: string,
): { semana: number; mes: number; total: number } {
  const inicioSemana = somarDias(hoje, -6);
  const inicioMes = somarDias(hoje, -29);
  let semana = 0;
  let mes = 0;
  for (const r of relatos) {
    const dia = diaDoRelato(r);
    // Ficha com data adiante de hoje é relógio errado no aparelho, não visita feita.
    if (!dia || dia > hoje) continue;
    if (dia >= inicioSemana) semana++;
    if (dia >= inicioMes) mes++;
  }
  return { semana, mes, total: relatos.length };
}

export type LinhaVendedor = {
  user_id: string;
  nome: string;
  semana: number;
  mes: number;
  total: number;
  ultima_visita: string;
};

/**
 * Uma linha por vendedor, ordenada por visitas no mês. Vendedor sem nenhuma
 * visita continua na lista — silêncio é justamente o que o gestor precisa ver.
 */
export function porVendedor(
  relatos: RelatoParaContagem[],
  membros: { user_id: string; nome: string }[],
  hoje: string,
): LinhaVendedor[] {
  const linhas = membros.map((m) => {
    const meus = relatos.filter((r) => texto(r.user_id) === m.user_id);
    const dias = meus.map(diaDoRelato).filter(Boolean).sort();
    const contagem = visitasPorPeriodo(meus, hoje);
    return {
      user_id: m.user_id,
      nome: m.nome || m.user_id,
      semana: contagem.semana,
      mes: contagem.mes,
      total: meus.length,
      ultima_visita: dias.at(-1) ?? "",
    };
  });
  return linhas.sort((a, b) => b.mes - a.mes || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Chave de agrupamento de texto livre: sem caixa, sem acento, sem pontuação final. */
export function normalizarTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.!?;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type Contagem = { texto: string; vezes: number };

export type ContagemObjecao = Contagem & {
  categoria: CategoriaObjecao;
  rotulo_categoria: string;
  cor: string;
};

export type DistribuicaoCategoria = {
  categoria: CategoriaObjecao;
  rotulo: string;
  cor: string;
  vezes: number;
  percentual: number;
};

/**
 * Agrupa texto livre por forma normalizada e devolve como rótulo a primeira
 * grafia vista — mostrar "preço alto" e "Preço alto" como duas linhas seria
 * ruído, e mostrar a versão normalizada faria o gestor ler texto sem acento.
 */
function ranquear(valores: string[], limite: number): Contagem[] {
  const vezes = new Map<string, number>();
  const rotulo = new Map<string, string>();
  for (const v of valores) {
    const bruto = v.trim();
    if (!bruto) continue;
    const chave = normalizarTexto(bruto);
    if (!chave) continue;
    vezes.set(chave, (vezes.get(chave) ?? 0) + 1);
    if (!rotulo.has(chave)) rotulo.set(chave, bruto);
  }
  return [...vezes.entries()]
    .map(([chave, n]) => ({ texto: rotulo.get(chave) ?? chave, vezes: n }))
    .sort((a, b) => b.vezes - a.vezes || a.texto.localeCompare(b.texto, "pt-BR"))
    .slice(0, limite);
}

/** Objeções mais frequentes na equipe enriquecidas com classificação tática. */
export function objecoesFrequentes(relatos: RelatoParaContagem[], limite = 8): ContagemObjecao[] {
  const ranking = ranquear(relatos.map((r) => texto(r.objecao)), limite);
  return ranking.map((item) => {
    const analise = analisarObjecao(item.texto);
    return {
      ...item,
      categoria: analise.categoria,
      rotulo_categoria: analise.rotulo_categoria,
      cor: analise.cor,
    };
  });
}

/** Agrupamento percentual por famílias macro de objeção para o gestor. */
export function calcularDistribuicaoObjecoes(relatos: RelatoParaContagem[]): DistribuicaoCategoria[] {
  const objecoesTextos = relatos.map((r) => texto(r.objecao)).filter(Boolean);
  if (!objecoesTextos.length) return [];

  const contagens: Record<CategoriaObjecao, number> = {
    preco: 0,
    concorrente: 0,
    timing: 0,
    decisor: 0,
    risco: 0,
    indefinida: 0,
  };

  for (const t of objecoesTextos) {
    const cat = classificarCategoriaObjecao(t);
    contagens[cat]++;
  }

  const total = objecoesTextos.length;
  const ordem: CategoriaObjecao[] = ["preco", "concorrente", "timing", "decisor", "risco", "indefinida"];

  return ordem
    .filter((cat) => contagens[cat] > 0)
    .map((cat) => {
      const pb = obterPlaybookObjecao(cat);
      const vezes = contagens[cat];
      return {
        categoria: cat,
        rotulo: pb.rotulo_categoria,
        cor: pb.cor,
        vezes,
        percentual: Math.round((vezes / total) * 100),
      };
    })
    .sort((a, b) => b.vezes - a.vezes);
}

/**
 * Perguntas que faltaram, somadas na equipe. Este é o indicador que vira
 * treinamento: se cinco vendedores esquecem prazo de pagamento, o problema é do
 * roteiro, não do vendedor.
 */
export function lacunasFrequentes(relatos: RelatoParaContagem[], limite = 8): Contagem[] {
  const todas: string[] = [];
  for (const r of relatos) {
    const lista = Array.isArray(r.faltou_perguntar) ? r.faltou_perguntar : [];
    for (const item of lista) if (typeof item === "string") todas.push(item);
  }
  return ranquear(todas, limite);
}

export type Painel = {
  hoje: string;
  equipe: { semana: number; mes: number; total: number };
  vendedores: LinhaVendedor[];
  objecoes: ContagemObjecao[];
  distribuicao_objecoes: DistribuicaoCategoria[];
  lacunas: Contagem[];
  /** Quantos vendedores não registraram visita nos últimos 7 dias. */
  sem_visita_na_semana: number;
};

export function montarPainel(
  relatos: RelatoParaContagem[],
  membros: { user_id: string; nome: string }[],
  hoje: string,
): Painel {
  const vendedores = porVendedor(relatos, membros, hoje);
  return {
    hoje,
    equipe: visitasPorPeriodo(relatos, hoje),
    vendedores,
    objecoes: objecoesFrequentes(relatos),
    distribuicao_objecoes: calcularDistribuicaoObjecoes(relatos),
    lacunas: lacunasFrequentes(relatos),
    sem_visita_na_semana: vendedores.filter((v) => v.semana === 0).length,
  };
}
