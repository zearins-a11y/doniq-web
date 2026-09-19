/**
 * Gerador de Mini-Checklist Pré-Visita & Cheat Sheet de 30 Segundos do Vendedor.
 *
 * Princípios de Engenharia:
 *  1. ZERO TOKENS & DETERMINÍSTICO: Execução local em sub-milissegundo.
 *  2. CONSUMO EM 30 SEGUNDOS: O vendedor lê no carro antes de desligar o motor:
 *     - Última conversa e compromisso anterior;
 *     - Objeção conhecida e script recomendado de contorno;
 *     - 3 a 5 perguntas essenciais da visita para não esquecer.
 *  3. ZERO AUDIO LEAKAGE: Opera estritamente com metadados estruturados e playbooks locais.
 */

import { montarRoteiro, tipoValido } from "../../api/relato/checklist";
import { analisarObjecao } from "../../api/relato/objecoes";
import type { EventoAgenda } from "./api";
import { linkWhatsApp } from "./formato";
import {
  type CandidatoEncaixe,
  extrairPrimeiroNome,
  normalizarTexto,
} from "./radar-proximidade";
import { diferencaDias } from "./sla-retomada";

export interface ItemChecklistVisita {
  id: string;
  pergunta: string;
  essencial: boolean;
}

export interface CheatSheetVisita {
  id: string;
  empresa: string;
  contato: string;
  primeiroNome: string;
  cargo?: string;
  telefone: string;
  endereco: string;
  hora: string;
  dia: string;
  objetivo: string;
  tipoVisita: string;
  diasSemContato: number;
  ultimaConversa?: string;
  dataUltimaConversa?: string;
  objecaoConhecida?: {
    categoria: string;
    rotulo: string;
    textoOriginal: string;
    diagnostico: string;
    contraArgumentoRecomendado: string;
    perguntaDestravamento: string;
  };
  checklist: ItemChecklistVisita[];
  linkWaze: string;
  linkMaps: string;
  linkWhatsApp: string;
}

export type FonteVisita =
  | EventoAgenda
  | CandidatoEncaixe
  | {
      id?: string;
      titulo?: string;
      empresa?: string;
      contato?: string;
      telefone?: string;
      local?: string;
      endereco?: string;
      dia?: string;
      hora?: string;
      detalhe?: string;
      objetivo?: string;
      selo?: string;
      objecao?: string;
      relato_id?: string;
    };

/**
 * Infere o tipo de visita a partir do objetivo/detalhes informados.
 */
export function inferirTipoVisita(texto = ""): string {
  const norm = normalizarTexto(texto);
  if (norm.includes("fechamento") || norm.includes("contrato") || norm.includes("assinar") || norm.includes("proposta final")) {
    return "fechamento";
  }
  if (norm.includes("pos-venda") || norm.includes("pos venda") || norm.includes("entrega") || norm.includes("satisfacao") || norm.includes("implantacao") || /\bpos\b/.test(norm)) {
    return "posvenda";
  }
  if (norm.includes("retorno") || norm.includes("retomar") || norm.includes("segunda") || norm.includes("proposta")) {
    return "retorno";
  }
  return "prospeccao";
}

/**
 * Gera a Cheat Sheet estruturada para preparação de visita em 30 segundos.
 */
export function gerarCheatSheetVisita(
  fonte: FonteVisita,
  historicoGeral: EventoAgenda[] = [],
  hojeIso = "",
  verticalId = "geral",
): CheatSheetVisita {
  const empresa = (("titulo" in fonte && fonte.titulo) || ("empresa" in fonte && fonte.empresa) || "").trim();
  const contato = fonte.contato?.trim() || "";
  const telefone = fonte.telefone?.trim() || "";
  const endereco = (("local" in fonte && fonte.local) || ("endereco" in fonte && fonte.endereco) || "").trim();
  const dia = ("dia" in fonte && fonte.dia) ? fonte.dia : (hojeIso || "");
  const hora = ("hora" in fonte && fonte.hora) ? fonte.hora : "";
  const id = fonte.id || `cs-${Date.now()}`;
  const objetivo = (
    ("detalhe" in fonte && fonte.detalhe) ||
    ("motivoSugerido" in fonte && fonte.motivoSugerido) ||
    ("objetivo" in fonte && fonte.objetivo) ||
    "Alinhamento e apresentação comercial"
  ).trim();

  const primeiroNome = extrairPrimeiroNome(contato);
  const tipoVisita = tipoValido(inferirTipoVisita(objetivo));

  // Busca histórico prévio da mesma empresa
  const empresaNorm = normalizarTexto(empresa);
  let ultimaConversa = "";
  let dataUltimaConversa = "";
  let objecaoTexto = fonte.objecao?.trim() || "";

  if (empresaNorm) {
    for (const h of historicoGeral) {
      if (h.id === fonte.id) continue;
      const hEmpresaNorm = normalizarTexto(h.titulo || "");
      if (hEmpresaNorm === empresaNorm || hEmpresaNorm.includes(empresaNorm) || empresaNorm.includes(hEmpresaNorm)) {
        if (!ultimaConversa && h.detalhe) {
          ultimaConversa = h.detalhe;
          dataUltimaConversa = h.dia || "";
        }
        if (!objecaoTexto && h.objecao?.trim()) {
          objecaoTexto = h.objecao.trim();
        }
        if (ultimaConversa && objecaoTexto) break;
      }
    }
  }

  // Dias sem contato
  const diasSemContato = dataUltimaConversa && hojeIso
    ? Math.max(0, diferencaDias(hojeIso, dataUltimaConversa))
    : ("diasSemContato" in fonte && typeof fonte.diasSemContato === "number" ? fonte.diasSemContato : 0);

  // Playbook de objeção
  let objecaoConhecida: CheatSheetVisita["objecaoConhecida"];
  if (objecaoTexto) {
    const analise = analisarObjecao(objecaoTexto);
    objecaoConhecida = {
      categoria: analise.categoria,
      rotulo: analise.rotulo_categoria,
      textoOriginal: objecaoTexto,
      diagnostico: analise.diagnostico,
      contraArgumentoRecomendado:
        analise.contra_argumentos[0] ||
        "Demonstre flexibilidade e valide o impacto do problema antes de debater preços.",
      perguntaDestravamento:
        analise.perguntas_destravamento[0] ||
        "O que precisaria acontecer para darmos o próximo passo com segurança?",
    };
  }

  // Checklist do Roteiro (base + vertical)
  const itensRoteiro = montarRoteiro(verticalId, tipoVisita);
  const checklist: ItemChecklistVisita[] = itensRoteiro.slice(0, 5).map((item) => ({
    id: item.id,
    pergunta: item.pergunta,
    essencial: item.tipos[tipoVisita] === 0,
  }));

  // Links rápidos
  const destinoNavegacao = endereco || empresa;
  const linkMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinoNavegacao)}`;
  const linkWaze = `https://waze.com/ul?q=${encodeURIComponent(destinoNavegacao)}&navigate=yes`;
  const linkWa = telefone
    ? linkWhatsApp(
        telefone,
        `Olá${primeiroNome ? ` ${primeiroNome}` : ""}! Estou a caminho do nosso compromisso hoje.`,
      )
    : "";

  return {
    id,
    empresa,
    contato,
    primeiroNome,
    telefone,
    endereco,
    hora,
    dia,
    objetivo,
    tipoVisita,
    diasSemContato,
    ultimaConversa: ultimaConversa || undefined,
    dataUltimaConversa: dataUltimaConversa || undefined,
    objecaoConhecida,
    checklist,
    linkWaze,
    linkMaps,
    linkWhatsApp: linkWa,
  };
}
