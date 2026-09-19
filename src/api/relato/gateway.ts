import { createGateway } from "ai";

/**
 * O gateway valida o `file part` no formato do protocolo v2 (`data` é string
 * base64, Uint8Array ou URL), mas o AI SDK v7 serializa `data` como
 * `{ type: "data", data: "<base64>" }`. Sem desembrulhar, todo áudio volta
 * "Invalid input" — foi verificado contra o gateway real.
 */
const fetchCompativel = async (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> => {
  if (init?.body && typeof init.body === "string" && init.body.includes('"type":"file"')) {
    try {
      const corpo = JSON.parse(init.body) as {
        prompt?: { content?: unknown }[];
      };
      for (const msg of corpo.prompt ?? []) {
        if (!Array.isArray(msg.content)) continue;
        for (const parte of msg.content as Record<string, unknown>[]) {
          const d = parte.data as { type?: string; data?: unknown } | undefined;
          if (parte.type === "file" && d && typeof d === "object" && d.type === "data") {
            parte.data = d.data;
          }
        }
      }
      init = { ...init, body: JSON.stringify(corpo) };
    } catch {
      /* corpo não-JSON: segue como veio */
    }
  }
  return fetch(input, init);
};

/**
 * Lista de modelos em ordem de preferência. O primeiro disponível é usado.
 * Fallback chain: Anthropic > Google > OpenAI > Groq
 */
export const MODELOS_EXTRACAO = [
  "google/gemini-2.5-flash",
  "anthropic/claude-sonnet-4-20250514",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-1.5-pro",
  "openai/gpt-4o-mini",
  "groq/llama-3.3-70b",
] as const;
export type ModeloExtracao = (typeof MODELOS_EXTRACAO)[number];

/** Modelos nativos de transcrição, em ordem de preferência. */
export const MODELOS_ASR = [
  "openai/gpt-4o-mini-transcribe",
  "google/gemini-3.5-transcribe",
] as const;

/** Modelo de texto usado somente para corrigir grafia após a transcrição. */
export const MODELO_CORRECAO_ASR = "google/gemini-2.5-flash";

/** Impede o gateway de escolher provedores que usem o conteúdo para treinamento. */
export const OPCOES_PRIVACIDADE_GATEWAY = {
  gateway: {
    disallowPromptTraining: true,
  },
};

/** Chamadas textuais usam apenas provedores que também garantem retenção zero. */
export const OPCOES_PRIVACIDADE_TEXTO_GATEWAY = {
  gateway: {
    ...OPCOES_PRIVACIDADE_GATEWAY.gateway,
    zeroDataRetention: true,
  },
};

/**
 * Modelo de extração atual. Começa com o primeiro da lista e,
 * em caso de falha, tenta o próximo.
 */
let modeloEmUso: string = MODELOS_EXTRACAO[0];
export const MODELO_EXTRACAO = () => modeloEmUso;

/**
 * Reseta o modelo em uso para o primeiro da lista (útil para testes).
 */
export function resetarModeloExtracao() {
  modeloEmUso = MODELOS_EXTRACAO[0];
}

/** Tenta os modelos em ordem sem alterar a preferência de outra operação. */
export async function tentarModelos<T>(
  operacao: (modelo: string) => Promise<T>,
  modelos: readonly string[],
): Promise<{ resultado: T; modelo: string }> {
  const erros: string[] = [];

  for (const modelo of modelos) {
    try {
      const resultado = await operacao(modelo);
      return { resultado, modelo };
    } catch (e) {
      erros.push(`${modelo}: ${(e as Error).message}`);
    }
  }

  throw new Error(
    `Todos os modelos falharam:\n${erros.map((e) => `  - ${e}`).join("\n")}`,
  );
}

/**
 * Tenta um modelo e, se falhar, tenta o próximo na lista.
 * Retorna o modelo que funcionou.
 */
export async function modeloComFallback<T>(
  operacao: (modelo: string) => Promise<T>,
  modelos: readonly string[] = MODELOS_EXTRACAO,
): Promise<{ resultado: T; modelo: string }> {
  const resposta = await tentarModelos(operacao, modelos);
  modeloEmUso = resposta.modelo;
  return resposta;
}

/**
 * Gateway primário (mesmo comportamento de antes).
 */
export const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
  fetch: fetchCompativel as typeof fetch,
});

/**
 * Gateways fallback para quando o primário não responde.
 * Cada gateway tenta um provedor diferente.
 */
export const gatewaysFallback: Array<{ nome: string; baseURL: string; apiKey: string }> = [
  {
    nome: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY ?? "",
  },
  {
    nome: "openai-compatible",
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY ?? "",
  },
].filter((g) => g.apiKey);

/**
 * Cria um gateway com URL customizada.
 */
export function criarGatewayCustom(baseURL: string, apiKey: string) {
  return createGateway({
    baseURL,
    apiKey,
    fetch: fetchCompativel as typeof fetch,
  });
}
