/**
 * Logger operacional — F15 do MVP.
 *
 * Regra: NUNCA grava conteúdo de relato, texto transcrito, nome de empresa,
 * nome de contato, e-mail ou qualquer dado pessoal do vendedor ou do cliente.
 *
 * O que é gravado (apenas metadados):
 * - timestamp ISO
 * - user_id (hash interno, não e-mail)
 * - ação (criar, editar, exportar, apagar, sincronizar)
 * - relato_id (quando aplicável)
 * - duração da requisição em ms
 * - código HTTP de resposta
 * - provider do erro (quando aplicável)
 *
 * Como usar: importe `log` e chame com o contexto da requisição.
 * Exemplo: `log({ acao: 'criar', relatoId, duracao: 340, status: 201 })`
 */

export type Acao =
  | "criar"
  | "editar"
  | "exportar"
  | "apagar"
  | "sincronizar"
  | "listar"
  | "obter"
  | "login"
  | "logout"
  | "audio_upload"
  | "transcrever"
  | "api:error"
  | "llm:metrics";

interface LogEntry {
  timestamp: string;
  user_id: string;
  acao: Acao;
  relato_id?: string;
  duracao_ms?: number;
  status: number;
  provider?: string;
  // métricas LLM
  modelo?: string;
  tentativa?: number;
  tokens_input?: number;
  tokens_output?: number;
}

/** Gera hash opaco do user_id para não expor IDs internos no log. */
function hashUserId(userId: string): string {
  // djb2 — rápido, determinístico, irreversível o suficiente para log
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i);
  }
  return `u_${Math.abs(h).toString(36)}`;
}

/**
 * Registra uma operação. Chama console.log em dev e pode ser conectado a
 * um agregador (Datadog, Axiom, etc.) em produção via variável de ambiente.
 */
export function log(entry: Omit<LogEntry, "timestamp" | "user_id"> & { userId: string }): void {
  const entry_: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    user_id: hashUserId(entry.userId),
  };

  // Em dev: saída legível no terminal
  if (process.env.NODE_ENV !== "production") {
    const dur = entry_.duracao_ms != null ? `+${entry_.duracao_ms}ms` : "";
    const prov = entry_.provider ? ` [${entry_.provider}]` : "";
    const tokens =
      entry_.tokens_input != null ? ` in:${entry_.tokens_input} out:${entry_.tokens_output}` : "";
    console.log(
      `[doniq] ${entry_.timestamp} ${entry_.acao} ${entry_.user_id}${dur}${tokens} → ${entry_.status}${prov}`,
    );
  }

  // Em produção: exportar para o agregador configurado
  if (process.env.NODE_ENV === "production") {
    // TODO(F15+): conectar com DATADOG_API_KEY, AXIOM_TOKEN ou similar
    // Exemplo: fetch("https://http-intake.logs.axiom.co/v1/ingest", ...)
    void entry_; // silencia o eslint até o agregador ser conectado
  }
}

/**
 * Wrapper de计时 para medir duração de qualquer operação assíncrona.
 *
 * @example
 * const { duracao, resultado } = await medir(() => api.criar(...))
 * log({ userId, acao: 'criar', relatoId, duracao, status: 201 })
 */
export async function medir<T>(fn: () => Promise<T>): Promise<{ duracao_ms: number; resultado: T }> {
  const inicio = performance.now();
  const resultado = await fn();
  const duracao_ms = Math.round(performance.now() - inicio);
  return { duracao_ms, resultado };
}
