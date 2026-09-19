/**
 * Chamada ao modelo. Defesas contra os modos de falha conhecidos:
 *   1. temperature=0 e prefill "{" — determinismo e nada de "Claro! Aqui está:"
 *   2. reparo de JSON truncado por max_tokens
 *   3. normalização obrigatória antes de devolver
 *   4. fallback entre modelos com backoff exponencial
 *   5. cache semântico: hash SHA-256 da transcrição evita re-extração
 *   6. tracking de tokens e latência por tentativa
 */

import { createHash } from "node:crypto";
import { generateText } from "ai";
import { MODELO_EXTRACAO, OPCOES_PRIVACIDADE_TEXTO_GATEWAY } from "./gateway";
import { TIPO_PADRAO } from "./checklist";
import { PROMPT_VERSAO, montarSystem } from "./prompts";
import type { AgoraBR } from "./tempo";
import { type Relato, normalizarRelato } from "./validators";

export const MAX_TOKENS = 1500;

/** Resultado de uma chamada ao modelo. */
export interface ResultadoModelo {
  texto: string;
  /** Tokens de entrada (prompt). */
  tokensInput: number;
  /** Tokens de saída (resposta). */
  tokensOutput: number;
  /** Latência em ms da chamada HTTP. */
  duracaoMs: number;
}

export class ErroLLM extends Error {}

export class ErroTodosModelos extends ErroLLM {
  readonly modelosTentados: string[];
  constructor(modelosTentados: string[]) {
    super(`Todos os ${modelosTentados.length} modelos falharam`);
    this.name = "ErroTodosModelos";
    this.modelosTentados = modelosTentados;
  }
}

/**
 * Hash SHA-256 de uma transcrição + userId.
 * Duas transcrições idênticas pelo mesmo usuário recebem o mesmo cache_key,
 * economizando chamadas ao LLM em reenvios offline.
 */
export function cacheKey(transcricao: string, userId: string): string {
  return createHash("sha256").update(`${userId}:${transcricao}`).digest("hex").slice(0, 32);
}

/**
 * Aceita: JSON puro, JSON em cerca markdown, JSON com preâmbulo e JSON
 * truncado no meio (acontece quando a resposta bate no max_tokens).
 */
export function extrairJson(texto: string): unknown {
  let t = (texto || "").trim();
  t = t.replace(/^```(?:json)?\s*/, "");
  t = t.replace(/\s*```$/, "");

  const ini = t.indexOf("{");
  if (ini === -1) throw new ErroLLM("resposta sem JSON");
  const fim = t.lastIndexOf("}");
  const bruto = fim > ini ? t.slice(ini, fim + 1) : t.slice(ini);

  try {
    return JSON.parse(bruto);
  } catch {
    const conta = (s: string, c: string) => s.split(c).length - 1;
    let consertado = bruto.replace(/\s+$/, "").replace(/,+$/, "");
    if (conta(consertado, '"') % 2) consertado += '"'; // string aberta
    consertado += "]".repeat(conta(consertado, "[") - conta(consertado, "]"));
    consertado += "}".repeat(conta(consertado, "{") - conta(consertado, "}"));
    try {
      return JSON.parse(consertado);
    } catch (e) {
      throw new ErroLLM(`JSON irrecuperável: ${(e as Error).message}`);
    }
  }
}

/** Tenta gerar texto com um modelo específico, retorna texto + usage + latência. */
export async function gerarComModelo(
  modelo: string,
  system: string,
  pedido: { role: "user"; content: string },
): Promise<ResultadoModelo> {
  const comum = {
    model: modelo,
    system,
    temperature: 0,
    maxOutputTokens: MAX_TOKENS,
    providerOptions: OPCOES_PRIVACIDADE_TEXTO_GATEWAY,
  };

  // Tenta com prefill primeiro (mais determinístico)
  try {
    const t0 = Date.now();
    const resposta = await generateText({
      ...comum,
      messages: [pedido, { role: "assistant", content: "{" }],
    });
    return {
      texto: "{" + resposta.text,
      tokensInput: resposta.usage.inputTokens ?? 0,
      tokensOutput: resposta.usage.outputTokens ?? 0,
      duracaoMs: Date.now() - t0,
    };
  } catch (e) {
    const msg = (e as Error).message;
    if (!/prefill/i.test(msg)) throw e;
  }

  // Sem prefill
  const t0 = Date.now();
  const resposta = await generateText({ ...comum, messages: [pedido] });
  return {
    texto: resposta.text,
    tokensInput: resposta.usage.inputTokens ?? 0,
    tokensOutput: resposta.usage.outputTokens ?? 0,
    duracaoMs: Date.now() - t0,
  };
}

/**
 * Latência e tokens totais de todas as tentativas até o sucesso.
 * Usado para log e auditoria.
 */
export interface MetricasExtracao {
  modelo: string;
  tentativa: number;
  tokensInput: number;
  tokensOutput: number;
  duracaoMs: number;
  totalDuracaoMs: number;
}

/** Transcrição -> objeto pronto para o banco, normalizado e com confiança por campo. */
export async function estruturar(
  transcricao: string,
  nome: string,
  produto: string,
  agora: AgoraBR,
  nomesConhecidos: string[] = [],
  vertical = "geral",
  tipo = TIPO_PADRAO,
  userId = "",
): Promise<Relato & { metrics: MetricasExtracao; cache_key: string }> {
  const t = (transcricao || "").trim();
  if (!t) {
    const vazio = normalizarRelato({ audio_ininteligivel: true }, agora.dia);
    return { ...vazio, metrics: { modelo: "", tentativa: 0, tokensInput: 0, tokensOutput: 0, duracaoMs: 0, totalDuracaoMs: 0 }, cache_key: "" };
  }

  const system = montarSystem(nome, produto, agora.iso, nomesConhecidos, vertical, tipo);
  const pedido = { role: "user" as const, content: `Transcrição:\n"""\n${t}\n"""` };

  // Modelos em ordem de fallback (Google Gemini primário -> Claude -> OpenAI)
  const modelosFallback = [MODELO_EXTRACAO(), "anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"];

  // Backoff exponencial entre modelos: 0ms, 200ms, 600ms
  const backoffs = [0, 200, 600];

  let totalDuracaoMs = 0;
  let totalTokensInput = 0;
  let totalTokensOutput = 0;

  for (let i = 0; i < modelosFallback.length; i++) {
    const modelo = modelosFallback[i];

    // Backoff antes de tentar (exceto na primeira tentativa)
    if (backoffs[i] > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoffs[i]));
    }

    try {
      const resultado = await gerarComModelo(modelo, system, pedido);
      totalDuracaoMs += resultado.duracaoMs;
      totalTokensInput += resultado.tokensInput;
      totalTokensOutput += resultado.tokensOutput;

      const relato = normalizarRelato(extrairJson(resultado.texto), agora.dia, t);
      relato.prompt_versao = PROMPT_VERSAO;
      relato.modelo = modelo;
      relato.tokens_input = totalTokensInput;
      relato.tokens_output = totalTokensOutput;
      relato.duracao_ms = totalDuracaoMs;

      relato.cache_key = cacheKey(t, userId);

      const metrics: MetricasExtracao = {
        modelo,
        tentativa: i + 1,
        tokensInput: totalTokensInput,
        tokensOutput: totalTokensOutput,
        duracaoMs: resultado.duracaoMs,
        totalDuracaoMs,
      };

      return { ...relato, metrics, cache_key: relato.cache_key };
    } catch (e) {
      // Log em dev — em prod fica só no aggregate de métricas (Sentry).
      if (process.env.NODE_ENV === "development") {
        console.warn(`[LLM] ${modelo} falhou (tentativa ${i + 1}): ${(e as Error).message}`);
      }
      // Tenta próximo modelo
    }
  }

  // Se chegou aqui, todos os modelos falharam
  throw new ErroTodosModelos(modelosFallback);
}
