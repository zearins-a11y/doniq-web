/** Contrato comum dos conectores de CRM. Adaptadores são puros na montagem do payload. */

export const PROVEDORES = ["agendor", "hubspot", "moskit", "ollow", "pipedrive", "ploomes", "rdstation"] as const;
export type Provedor = (typeof PROVEDORES)[number];

export const NOMES_PROVEDOR: Record<Provedor, string> = {
  agendor: "Agendor",
  hubspot: "HubSpot CRM",
  moskit: "Moskit CRM",
  ollow: "Ollow",
  pipedrive: "Pipedrive",
  ploomes: "Ploomes",
  rdstation: "RD Station CRM",
};

/** Relato normalizado — única fonte de verdade para todos os adaptadores. */
export type RelatoCanonico = {
  chave: string;
  organizacao: { nome: string };
  pessoa: { nome: string; cargo: string; telefone: string };
  negocio: { titulo: string; descricao: string; temperatura: string; tags: string[] };
  anotacao: { texto: string };
  tarefa: { texto: string; dataIso: string; hora: string } | null;
  extras: { objecao: string; concorrentes: string[]; numeros: string[]; visitaEm: string };
};

export type IdsExternos = Record<string, string>;

export type Credenciais = { token: string; contaId?: string };

export type ContextoEnvio = {
  credenciais: Credenciais;
  funilId: string;
  etapaId: string;
  idsExistentes: IdsExternos;
  /** campo canônico -> identificador do campo personalizado no CRM do cliente */
  mapaCampos: Record<string, string>;
};

export type ResultadoEnvio = {
  ids: IdsExternos;
  /** Payloads enviados, para auditoria. */
  payload: unknown;
};

export type Adaptador = {
  provedor: Provedor;
  nome: string;
  /** Rótulo do campo de credencial na tela de configuração. */
  rotuloToken: string;
  ajuda: string;
  testar(credenciais: Credenciais): Promise<void>;
  enviar(relato: RelatoCanonico, ctx: ContextoEnvio): Promise<ResultadoEnvio>;
};

export class ErroCrm extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;
  constructor(mensagem: string, status = 0, retryAfterMs: number | null = null) {
    super(mensagem);
    this.name = "ErroCrm";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function ehProvedor(v: string): v is Provedor {
  return (PROVEDORES as readonly string[]).includes(v);
}
