/**
 * O que o gestor pode ver de um relato que não é dele.
 *
 * Promessa feita ao vendedor: o gestor lê a ficha, nunca a fala. Duas coisas
 * precisam sair, não uma:
 *   - `transcricao`, a gravação transcrita inteira;
 *   - `evidencia`, que é um dicionário de CITAÇÕES LITERAIS da transcrição. Ela
 *     existe para o portão anti-alucinação e vazaria a fala em pedaços.
 *
 * A defesa é uma allowlist, não uma blocklist: campo novo na ficha começa
 * invisível para o gestor e só aparece quando alguém escrever o nome dele aqui.
 * Se fosse blocklist, um campo novo com fala bruta vazaria em silêncio.
 */

/** Campos que o gestor vê de um relato de outra pessoa. */
export const CAMPOS_VISIVEIS_AO_GESTOR = [
  "relato_id",
  "user_id",
  "empresa",
  "contato",
  "cargo",
  "resumo",
  "objecao",
  "analise_objecao",
  "proxima_acao",
  "data_iso",
  "hora",
  "temperatura",
  "faltou_perguntar",
  "precisa_confirmar",
  "campo_a_confirmar",
  "tags",
  "concorrentes",
  "revisado",
  "campos_a_revisar",
  // perguntas de catálogo e sim/não — não carregam fala do vendedor
  "tipo_visita",
  "roteiro",
  "created_at",
  "crm_status",
] as const;

/**
 * Campos que nunca saem para o gestor, listados com o motivo.
 * Documentação, não mecanismo — a allowlist acima é quem barra.
 */
export const NEGADOS_AO_GESTOR: Record<string, string> = {
  transcricao: "é a fala bruta do vendedor",
  evidencia: "são citações literais da transcrição",
  telefone: "contato pessoal do cliente, não é indicador de gestão",
  followup: "texto que o vendedor escreve para si mesmo",
  numeros: "valores soltos citados na conversa, sem contexto viram fofoca de preço",
  confianca: "diagnóstico interno do extrator",
  audio_ininteligivel: "detalhe técnico da gravação",
  prompt_versao: "detalhe interno do modelo",
  modelo: "detalhe interno do modelo",
};

export type FichaDoGestor = Record<string, unknown>;

/** Aplica a allowlist. Campo ausente na origem não é inventado na saída. */
export function fichaParaGestor(relato: Record<string, unknown>): FichaDoGestor {
  const saida: FichaDoGestor = {};
  for (const campo of CAMPOS_VISIVEIS_AO_GESTOR) {
    if (campo in relato) saida[campo] = relato[campo];
  }
  return saida;
}

/**
 * Quando o gestor olha o próprio relato, não há o que esconder — mas manter a
 * mesma forma evita tela que muda de layout dependendo de quem gravou.
 */
export function fichasParaGestor(relatos: Record<string, unknown>[]): FichaDoGestor[] {
  return relatos.map(fichaParaGestor);
}
