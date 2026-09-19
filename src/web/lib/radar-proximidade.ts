/**
 * Motor de Inteligência do Radar de Proximidade & Encaixe de Agenda Comercial ("Clientes por Perto").
 *
 * Princípios de Engenharia:
 *  1. ZERO TOKENS & DETERMINÍSTICO: Execução local instantânea (sub-milissegundo).
 *  2. OTIMIZAÇÃO DE ROTA: Sugere contas da carteira próximas ao compromisso atual ou localização do vendedor.
 *  3. PRIORIZAÇÃO COMERCIAL: Ranqueia por temperatura, tempo de silêncio e facilidade de visita espontânea.
 *  4. ZERO AUDIO LEAKAGE: Opera estritamente com metadados estruturados (endereço, empresa, contato, datas).
 */

import type { EventoAgenda } from "./api";
import { diferencaDias } from "./sla-retomada";

export interface CandidatoEncaixe {
  id: string;
  empresa: string;
  contato: string;
  telefone: string;
  endereco: string;
  regiaoOuCidade: string;
  diasSemContato: number;
  temperatura: "quente" | "morna" | "fria";
  objecao?: string;
  ultimaAcao?: string;
  scorePrioridade: number; // 0 a 100
  motivoSugerido: string;
  mensagemWhatsApp: string;
  linkMaps: string;
  linkWaze: string;
}

/**
 * Normaliza strings para comparação fonética/semântica simples sem acentos e minúsculas.
 */
export function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Extrai o primeiro nome de um contato comercial.
 */
export function extrairPrimeiroNome(nomeCompleto?: string): string {
  if (!nomeCompleto) return "";
  const limpo = nomeCompleto.trim().split(/\s+/)[0] || "";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
}

/**
 * Extrai cidade, bairro ou polo comercial a partir do endereço, nome da empresa ou detalhe.
 */
export function extrairRegiaoOuCidade(
  endereco: string,
  empresa: string,
  detalhe = "",
): string {
  const combinado = `${endereco} ${empresa} ${detalhe}`.trim();
  if (!combinado) return "Região comercial";

  // 1. Tenta extrair padrões comuns de endereço brasileiro: "Bairro, Cidade" ou "Cidade - UF"
  // Ex: "Av. Brasil 1500, Batel, Curitiba - PR" -> "Batel, Curitiba"
  const partes = endereco.split(/[,-]/).map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 2) {
    const penultima = partes[partes.length - 2];
    const ultima = partes[partes.length - 1];
    if (penultima && ultima && ultima.length <= 4) {
      // Ex: "Curitiba", "PR" -> retorna "Curitiba"
      return penultima;
    }
    if (penultima) return penultima;
  }

  // 2. Se a empresa tem parênteses ou traço indicando filial: "AgroSol - Londrina" ou "Alfa (Maringá)"
  const matchParenteses = empresa.match(/\(([^)]+)\)/);
  if (matchParenteses?.[1]) return matchParenteses[1].trim();

  const matchTraco = empresa.split(" - ");
  if (matchTraco.length > 1 && matchTraco[1]) return matchTraco[1].trim();

  if (endereco.trim()) return endereco.trim();
  return "Região central";
}

/**
 * Gera mensagem ágil e natural de abordagem espontânea para WhatsApp.
 */
export function gerarMensagemEncaixe(
  contato: string,
  empresa: string,
  acao = "",
  regiao = "",
): string {
  const pNome = extrairPrimeiroNome(contato);
  const saudacao = pNome ? `Oi ${pNome}!` : "Olá!";
  const contextoRegiao = regiao && regiao !== "Região central" && regiao !== "Região comercial"
    ? ` aqui perto em ${regiao}`
    : " aqui perto na sua região";

  if (acao.trim()) {
    const acaoLimpa = acao.replace(/\.$/, "").toLowerCase();
    return `${saudacao} Estou terminando um atendimento${contextoRegiao} e lembrei do nosso alinhamento sobre ${acaoLimpa}. Consegue me receber por 15 minutinhos para um café rápido agora?`;
  }

  return `${saudacao} Estou visitando um cliente${contextoRegiao} e lembrei de vocês${empresa ? ` na ${empresa}` : ""}. Como está sua agenda para eu dar um pulo rápido aí antes do almoço?`;
}

/**
 * Calcula o Score de Prioridade Comercial do encaixe (0 a 100).
 */
export function calcularScoreEncaixe(
  temperatura: "quente" | "morna" | "fria",
  diasSemContato: number,
  temObjecao: boolean,
  afinidadeGeografica: boolean,
): number {
  let score = 20;

  // 1. Temperatura
  if (temperatura === "quente") score += 35;
  else if (temperatura === "morna") score += 20;
  else score += 10;

  // 2. Objeção ativa (presença física desobstrui com facilidade)
  if (temObjecao) score += 15;

  // 3. Dias de silêncio (janela ideal de retorno espontâneo: 10 a 45 dias)
  if (diasSemContato >= 10 && diasSemContato <= 35) {
    score += 20;
  } else if (diasSemContato > 35) {
    score += 15;
  } else if (diasSemContato >= 5) {
    score += 10;
  }

  // 4. Afinidade com a localização de referência
  if (afinidadeGeografica) score += 25;

  return Math.min(100, Math.max(0, score));
}

/**
 * Filtra e ranqueia candidatos da carteira para encaixe de visita próxima.
 */
export function filtrarCandidatosEncaixe(
  eventosAgenda: EventoAgenda[],
  semData: EventoAgenda[],
  termoReferencia = "",
  hojeIso = "",
): CandidatoEncaixe[] {
  const refNorm = normalizarTexto(termoReferencia);
  const mapaVistos = new Set<string>();
  const todosEventos = [...eventosAgenda, ...semData];
  const resultado: CandidatoEncaixe[] = [];

  for (const ev of todosEventos) {
    const empresa = ev.titulo?.trim();
    if (!empresa) continue;

    // Evita duplicatas da mesma empresa
    const chaveEmpresa = normalizarTexto(empresa);
    if (mapaVistos.has(chaveEmpresa)) continue;
    mapaVistos.add(chaveEmpresa);

    const endereco = ev.local?.trim() || "";
    const regiao = extrairRegiaoOuCidade(endereco, empresa, ev.detalhe);
    const regiaoNorm = normalizarTexto(regiao);
    const enderecoNorm = normalizarTexto(endereco);
    const empresaNorm = chaveEmpresa;

    // Afinidade geográfica: bate com a cidade/bairro/polo pesquisado
    const afinidade = Boolean(
      refNorm &&
      (regiaoNorm.includes(refNorm) ||
       enderecoNorm.includes(refNorm) ||
       empresaNorm.includes(refNorm) ||
       refNorm.includes(regiaoNorm)),
    );

    // Se houver termo de busca forte e o item não combinar e não for lead quente com endereço, ignora
    if (refNorm && !afinidade && ev.temperatura !== "quente" && !endereco) {
      continue;
    }

    const dataReferencia = ev.dia || "";
    const diasSemContato = dataReferencia && hojeIso
      ? Math.max(0, diferencaDias(hojeIso, dataReferencia))
      : 12; // Valor padrão prudente se não houver data

    const temp = (ev.temperatura === "quente" || ev.temperatura === "fria")
      ? ev.temperatura
      : "morna";

    const temObjecao = Boolean(ev.objecao?.trim());
    const score = calcularScoreEncaixe(temp, diasSemContato, temObjecao, afinidade);

    // Motivo sugerido
    let motivo = "Oportunidade na sua região";
    if (temp === "quente" && diasSemContato >= 5) {
      motivo = `Lead quente sem visita há ${diasSemContato} dias`;
    } else if (temObjecao) {
      motivo = "Cliente com objeção pendente: visita rápida destrava";
    } else if (afinidade) {
      motivo = `Cliente próximo (${regiao})`;
    }

    const destinoNavegacao = endereco || `${empresa}, ${regiao}`;
    const linkMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinoNavegacao)}`;
    const linkWaze = `https://waze.com/ul?q=${encodeURIComponent(destinoNavegacao)}&navigate=yes`;
    const mensagemWhatsApp = gerarMensagemEncaixe(ev.contato, empresa, ev.detalhe, regiao);

    resultado.push({
      id: ev.relato_id || ev.id,
      empresa,
      contato: ev.contato || "",
      telefone: ev.telefone || "",
      endereco,
      regiaoOuCidade: regiao,
      diasSemContato,
      temperatura: temp,
      objecao: ev.objecao,
      ultimaAcao: ev.detalhe,
      scorePrioridade: score,
      motivoSugerido: motivo,
      mensagemWhatsApp,
      linkMaps,
      linkWaze,
    });
  }

  // Ordena por score decrescente (maior relevância comercial e geográfica primeiro)
  return resultado.sort((a, b) => b.scorePrioridade - a.scorePrioridade);
}
