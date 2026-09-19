/**
 * Camada HTTP. Token no localStorage, timeout sempre, erro em português.
 *
 * O transporte é oRPC (padrão do template), mas a superfície `api.*` é a mesma
 * do projeto original — as telas continuam chamando `api.entrar`, `api.agenda`…
 */

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";

const CHAVE_TOKEN = "relato:token";

export const getToken = () => localStorage.getItem(CHAVE_TOKEN) || "";
export const setToken = (t: string) => localStorage.setItem(CHAVE_TOKEN, t);
export const limparToken = () => localStorage.removeItem(CHAVE_TOKEN);

/**
 * Token do dispositivo (login por e-mail) ou, na falta dele, o do login com
 * Google via better-auth. Login com Google nativo não usa token em localStorage —
 * a sessão vive no cookie do better-auth (ver o fallback por cookie em app.tsx).
 */
export function tokenAtual(): string {
  return getToken() || "";
}

function cabecalhos(): Record<string, string> {
  const t = tokenAtual();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  headers: cabecalhos,
});

/** Direct typed client: await client.saude() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.saude.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);

export class ErroAPI extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

const CODIGO_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  BAD_GATEWAY: 502,
};

function traduzir(e: unknown): ErroAPI {
  const err = e as { name?: string; code?: string; status?: number; message?: string };
  if (err?.name === "AbortError" || err?.name === "TimeoutError") {
    return new ErroAPI("A conexão demorou demais.", 0);
  }
  const status = err?.status ?? (err?.code ? CODIGO_STATUS[err.code] : undefined);
  if (status) {
    if (status === 401) limparToken();
    return new ErroAPI(err?.message || "Algo deu errado. Tente de novo.", status);
  }
  return new ErroAPI("Sem conexão com o servidor.", 0);
}

async function chamar<T>(fn: (opcoes: { signal: AbortSignal }) => Promise<T>, timeout = 30000): Promise<T> {
  try {
    return await fn({ signal: AbortSignal.timeout(timeout) });
  } catch (e) {
    if (e instanceof ErroAPI) throw e;
    throw traduzir(e);
  }
}

export interface Usuario {
  user_id: string;
  email: string;
  nome: string;
  produto: string;
  vertical: string;
  criado_em: string;
}

/** Um item do roteiro da visita, já conferido contra a ficha e a fala. */
export interface PontoRoteiro {
  id: string;
  pergunta: string;
  coberto: boolean;
  como: "ficha" | "fala" | "";
}

export interface TipoVisita {
  id: string;
  rotulo: string;
  quando: string;
}

export interface ItemCatalogoRoteiro {
  id: string;
  pergunta: string;
  campo?: string;
  sinais: string[];
}

export interface Verticais {
  lista: { id: string; rotulo: string; curto: string }[];
  atual: string;
  tipos: TipoVisita[];
  tipo_padrao: string;
  /** Roteiro pronto de cada tipo, para a tela funcionar sem rede. */
  roteiros: Record<string, string[]>;
  catalogo?: Record<string, ItemCatalogoRoteiro[]>;
  todos_roteiros?: Record<string, Record<string, string[]>>;
}

export type CategoriaObjecao =
  | "preco"
  | "concorrente"
  | "timing"
  | "decisor"
  | "risco"
  | "indefinida";

export interface PlaybookObjecao {
  categoria: CategoriaObjecao;
  rotulo_categoria: string;
  cor: "amber" | "violet" | "sky" | "rose" | "emerald" | "slate";
  diagnostico: string;
  contra_argumentos: string[];
  perguntas_destravamento: string[];
  orientacao_gestor: string;
}

export interface AnaliseObjecao extends PlaybookObjecao {
  texto_original: string;
}

export interface DistribuicaoObjecao {
  categoria: CategoriaObjecao;
  rotulo: string;
  cor: string;
  vezes: number;
  percentual: number;
}

export interface Relato {
  relato_id: string;
  user_id: string;
  transcricao: string;
  empresa: string;
  contato: string;
  cargo: string;
  telefone: string;
  resumo: string;
  resumo_narrativo: string;
  email_cliente: string;
  proximas_perguntas: string[];
  objecao: string;
  analise_objecao?: AnaliseObjecao | null;
  proxima_acao: string;
  data_iso: string;
  hora: string;
  temperatura: string;
  faltou_perguntar: string[];
  followup: string;
  precisa_confirmar: boolean;
  campo_a_confirmar: string;
  audio_ininteligivel: boolean;
  tags: string[];
  concorrentes: string[];
  numeros: string[];
  evidencia: Record<string, string>;
  confianca: Record<string, string>;
  revisado: boolean;
  campos_a_revisar: string[];
  tipo_visita: string;
  roteiro: PontoRoteiro[];
  prompt_versao: string;
  modelo: string;
  tokens_input: number;
  tokens_output: number;
  duracao_ms: number;
  cache_key: string;
  created_at: string;
}

export interface MudancasRelato {
  empresa?: string;
  contato?: string;
  cargo?: string;
  telefone?: string;
  resumo?: string;
  objecao?: string;
  proxima_acao?: string;
  data_iso?: string;
  hora?: string;
  temperatura?: string;
  faltou_perguntar?: string[];
  followup?: string;
  concorrentes?: string[];
  numeros?: string[];
  revisado?: boolean;
}

export interface Integracao {
  provedor: string;
  nome: string;
  token_mascarado: string;
  mapa_campos: Record<string, string>;
  funil_id: string;
  etapa_id: string;
  ativa: boolean;
  ultimo_teste_em: string;
  ultimo_teste_ok: boolean;
  ultimo_teste_erro: string;
  atualizado_em: string;
}

export interface ProvedorCrm {
  provedor: string;
  nome: string;
  rotulo_token: string;
  ajuda: string;
}

export interface Sincronizacao {
  provedor: string;
  status: string;
  tentativas: number;
  id_externo: Record<string, string>;
  erro: string;
  atualizado_em: string;
}

export type SalvarIntegracao = {
  provedor: "agendor" | "hubspot" | "moskit" | "ollow" | "pipedrive" | "ploomes" | "rdstation";
  token?: string;
  conta_id?: string;
  funil_id?: string;
  etapa_id?: string;
  mapa_campos?: Record<string, string>;
  ativa?: boolean;
};

/* ------------------------------------------------ equipe e painel do gestor */

export interface PessoaEquipe {
  user_id: string;
  nome: string;
  email: string;
  papel: "gestor" | "vendedor";
  entrou_em: string;
}

export interface ConviteEquipe {
  convite_id: string;
  email: string;
  papel: "gestor" | "vendedor";
  status: string;
  criado_em: string;
  expira_em: string;
  email_enviado: boolean;
}

export interface MinhaEquipe {
  equipe: { equipe_id: string; nome: string; dono_user_id: string } | null;
  papel: "gestor" | "vendedor" | null;
  pessoas: PessoaEquipe[];
  convites: ConviteEquipe[];
}

export interface LinhaVendedorPainel {
  user_id: string;
  nome: string;
  semana: number;
  mes: number;
  total: number;
  ultima_visita: string;
}

/**
 * A ficha que o gestor recebe. Note o que NÃO existe neste tipo: `transcricao` e
 * `evidencia`. O servidor não manda, e o tipo aqui deixa claro que a tela não
 * tem como mostrar — se alguém tentar, o TypeScript reclama antes do usuário.
 */
export interface FichaGestor {
  relato_id: string;
  user_id: string;
  empresa: string;
  contato: string;
  cargo: string;
  resumo: string;
  objecao: string;
  analise_objecao?: AnaliseObjecao | null;
  proxima_acao: string;
  /** Prazo do próximo passo — NÃO é a data da visita. */
  data_iso: string;
  hora: string;
  temperatura: string;
  faltou_perguntar: string[];
  tags: string[];
  concorrentes: string[];
  created_at: string;
  /** Dia da visita (YYYY-MM-DD) já no fuso do vendedor, calculado no servidor. */
  dia_visita: string;
  tipo_visita?: string;
  roteiro?: PontoRoteiro[];
  crm_status?: {
    provedor: string;
    status: "pendente" | "enviado" | "erro" | "processando";
    erro?: string;
    atualizado_em?: string;
  }[];
}

export interface PainelEquipe {
  equipe_nome: string;
  modo_solo?: boolean;
  hoje: string;
  equipe: { semana: number; mes: number; total: number };
  vendedores: LinhaVendedorPainel[];
  objecoes: {
    texto: string;
    vezes: number;
    categoria?: CategoriaObjecao;
    rotulo_categoria?: string;
    cor?: string;
  }[];
  distribuicao_objecoes?: DistribuicaoObjecao[];
  lacunas: { texto: string; vezes: number }[];
  sem_visita_na_semana: number;
  ultimas: FichaGestor[];
}

/**
 * Estado do envio de e-mail, decidido no servidor.
 *
 * A tela nunca deduz isso sozinha: se ela prometesse "enviamos para fulano"
 * enquanto o ambiente está em teste, o gestor ficaria esperando um e-mail que
 * foi parar em outra caixa.
 */
export interface EstadoEmail {
  modo: "desligado" | "teste" | "ligado";
  /** Falso quando não há chave/remetente: nesse caso não fingimos que enviou. */
  envia: boolean;
  /** Verdadeiro em teste: todo envio é desviado para a caixa de teste. */
  desvia: boolean;
}

export interface ResumoEnviado {
  enviado: boolean;
  motivo: string;
  desviado: boolean;
  modo: EstadoEmail["modo"];
  /** Sempre o e-mail da própria conta do gestor. */
  para: string;
  assunto: string;
  /** Corpo do resumo, para a tela mostrar mesmo com o provedor desligado. */
  texto: string;
}

export interface CanalEncarregado {
  aberto: boolean;
  assuntos: readonly string[];
  limite_mensagem: number;
  envios_por_hora: number;
}

/**
 * Estado da cobrança, decidido no servidor.
 *
 * A tela não calcula nada disso — nem dias de teste, nem se pode gravar. Conta de
 * cobrança feita no navegador é conta que o usuário pode editar.
 */
export interface EstadoCobranca {
  modo: "vitrine" | "teste" | "ativa" | "atrasada" | "vencida";
  /** Falso só em `vencida`. Histórico, painel e exportação nunca dependem disto. */
  pode_criar_ficha: boolean;
  dias_restantes: number;
  plano: "" | "mensal" | "anual";
  assentos: number;
  /** Frase pronta, em português. A tela mostra, não reescreve. */
  aviso: string;
  /** Esta conta é a que paga? Vendedor convidado recebe falso. */
  paga: boolean;
  /** Conta que recebe a fatura (dono da equipe). */
  pagante: string;
  total_mensal: number;
}

/** Um cartão da agenda. Vem de relato gravado ou de compromisso marcado na mão. */
export interface EventoAgenda {
  id: string;
  origem: "relato" | "compromisso";
  dia: string;
  hora: string;
  minutos: number;
  titulo: string;
  detalhe: string;
  contato: string;
  telefone: string;
  local: string;
  relato_id: string;
  concluido: boolean;
  cancelado: boolean;
  selo: string;
  link_google: string;
  temperatura?: string;
  objecao?: string;
}

export interface DiaGradeApi {
  dia: string;
  numero: number;
  do_mes: boolean;
  hoje: boolean;
  fim_de_semana: boolean;
}

export interface MesAgenda {
  hoje: string;
  mes: string;
  rotulo: string;
  primeiro_dia: string;
  ultimo_dia: string;
  semanas: DiaGradeApi[][];
  eventos: EventoAgenda[];
  dias_vazios: string[];
}

export interface NovoCompromisso {
  empresa: string;
  contato?: string;
  telefone?: string;
  objetivo?: string;
  endereco?: string;
  data_iso: string;
  hora?: string;
  minutos?: number;
}

export interface FeedAgenda {
  existe: boolean;
  token: string;
  criado_em: string;
  ultimo_acesso_em: string;
  acessos: number;
}

export const api = {
  pedirCodigo: (email: string, nome: string) =>
    chamar((o) => client.contas.pedirCodigo({ email, nome }, o)),
  entrarComCodigo: (email: string, codigo: string, nome: string) =>
    chamar((o) => client.contas.entrarComCodigo({ email, codigo, nome }, o)),
  eu: () => chamar((o) => client.contas.eu(undefined, o)),
  salvarPerfil: (dados: { nome?: string; produto?: string; vertical?: string }) =>
    chamar((o) => client.contas.salvarPerfil(dados, o)),
  verticais: (dados?: { vertical?: string }) =>
    chamar((o) => client.contas.verticais(dados ?? {}, o)) as Promise<Verticais>,
  sair: () => chamar((o) => client.contas.sair(undefined, o)),

  /** Upload multipart cru — igual ao export (POST /api/relatos/transcrever). */
  transcrever: async (form: FormData): Promise<{ transcricao: string }> => {
    try {
      const r = await fetch("/api/relatos/transcrever", {
        method: "POST",
        headers: cabecalhos(),
        body: form,
        signal: AbortSignal.timeout(180000),
      });
      const dados = (await r.json().catch(() => ({}))) as { transcricao?: string; detail?: string };
      if (!r.ok) {
        if (r.status === 401) limparToken();
        throw new ErroAPI(dados.detail || "Algo deu errado. Tente de novo.", r.status);
      }
      return { transcricao: dados.transcricao ?? "" };
    } catch (e) {
      if (e instanceof ErroAPI) throw e;
      throw traduzir(e);
    }
  },

  criar: (transcricao: string, clientId: string, tipoVisita?: string) =>
    chamar(
      (o) => client.relatos.criar({ transcricao, client_id: clientId, tipo_visita: tipoVisita }, o),
      90000,
    ),
  listar: () => chamar((o) => client.relatos.listar(undefined, o)),
  agenda: () => chamar((o) => client.relatos.agenda(undefined, o)),
  obter: (id: string) => chamar((o) => client.relatos.obter({ relato_id: id }, o)),
  editar: (id: string, mudancas: MudancasRelato) =>
    chamar((o) => client.relatos.editar({ relato_id: id, mudancas }, o)),
  apagar: (id: string) => chamar((o) => client.relatos.apagar({ relato_id: id }, o)),
  saude: () => chamar((o) => client.saude(undefined, o)),

  /* agenda: grade, compromisso na mão e feed .ics */
  mesAgenda: (mes?: string) => chamar((o) => client.agenda.mes({ mes }, o)) as Promise<MesAgenda>,
  faixaAgenda: (de: string, ate: string) =>
    chamar((o) => client.agenda.faixa({ de, ate }, o)) as Promise<{
      hoje: string;
      eventos: EventoAgenda[];
    }>,
  semDataAgenda: () =>
    chamar((o) => client.agenda.sem_data(undefined, o)) as Promise<{ eventos: EventoAgenda[] }>,
  criarCompromisso: (dados: NovoCompromisso) =>
    chamar((o) => client.agenda.criar(dados, o)) as Promise<EventoAgenda>,
  editarCompromisso: (id: string, mudancas: Partial<NovoCompromisso> & { status?: string }) =>
    chamar((o) => client.agenda.editar({ compromisso_id: id, mudancas } as never, o)),
  cancelarCompromisso: (id: string) =>
    chamar((o) => client.agenda.cancelar({ compromisso_id: id }, o)),
  icsEvento: (id: string) =>
    chamar((o) => client.agenda.ics_evento({ id }, o)) as Promise<{ nome: string; arquivo: string }>,
  feedAgenda: () => chamar((o) => client.agenda.feed(undefined, o)) as Promise<FeedAgenda>,
  gerarFeedAgenda: (trocar = false) => chamar((o) => client.agenda.gerar_feed({ trocar }, o)),
  revogarFeedAgenda: () => chamar((o) => client.agenda.revogar_feed(undefined, o)),

  /* integrações de CRM */
  provedoresCrm: () => chamar((o) => client.integracoes.provedores(undefined, o)),
  integracoes: () => chamar((o) => client.integracoes.listar(undefined, o)),
  salvarIntegracao: (dados: SalvarIntegracao) =>
    chamar((o) => client.integracoes.salvar(dados, o), 60000),
  testarIntegracao: (provedor: SalvarIntegracao["provedor"]) =>
    chamar((o) => client.integracoes.testar({ provedor }, o), 60000),
  removerIntegracao: (provedor: SalvarIntegracao["provedor"]) =>
    chamar((o) => client.integracoes.remover({ provedor }, o)),
  sincronizarRelato: (relatoId: string, provedor?: SalvarIntegracao["provedor"]) =>
    chamar((o) => client.integracoes.sincronizar({ relato_id: relatoId, provedor }, o), 120000),
  statusSincronizacao: (relatoId: string) =>
    chamar((o) => client.integracoes.statusRelato({ relato_id: relatoId }, o)),
  historicoSincronizacoes: () => chamar((o) => client.integracoes.historico(undefined, o)),

  /* LGPD: portabilidade. Pode demorar em conta cheia, daí o timeout maior. */
  exportarDados: () => chamar((o) => client.privacidade.exportar(undefined, o), 60000),

  /* equipe e painel do gestor */
  minhaEquipe: () => chamar((o) => client.equipe.minha(undefined, o)) as Promise<MinhaEquipe>,
  criarEquipe: (nome: string) => chamar((o) => client.equipe.criar({ nome }, o)),
  convidar: (email: string, papel = "vendedor") =>
    chamar((o) => client.equipe.convidar({ email, papel }, o), 45000),
  revogarConvite: (conviteId: string) =>
    chamar((o) => client.equipe.revogarConvite({ convite_id: conviteId }, o)),
  verConvite: (token: string) => chamar((o) => client.equipe.verConvite({ token }, o)),
  aceitarConvite: (token: string) => chamar((o) => client.equipe.aceitar({ token }, o)),
  removerDaEquipe: (userId: string) => chamar((o) => client.equipe.remover({ user_id: userId }, o)),
  sairDaEquipe: () => chamar((o) => client.equipe.sair(undefined, o)),
  /**
   * A ficha do painel sai do servidor como dicionário (a allowlist devolve só as
   * chaves permitidas, e o TypeScript não sabe quais são em tempo de compilação).
   * O `unknown` no meio é a costura entre a allowlist de runtime e o tipo da tela;
   * `PainelEquipe` é a fonte da verdade do que a tela pode desenhar — e nele não
   * existe `transcricao` nem `evidencia`.
   */
  painelEquipe: () =>
    chamar((o) => client.equipe.painel({}, o), 60000) as unknown as Promise<PainelEquipe>,

  /* e-mail */

  /** O que a tela pode prometer sobre envio. Quem decide é o servidor. */
  estadoEmail: () => chamar((o) => client.equipe.estadoEmail(undefined, o)) as Promise<EstadoEmail>,
  /** Resumo da semana no e-mail do próprio gestor. Sem destinatário vindo do cliente. */
  resumoSemanal: () =>
    chamar((o) => client.equipe.resumoSemanal({}, o), 60000) as Promise<ResumoEnviado>,

  /* LGPD: canal do encarregado, aberto sem login (direito de titular não é benefício de cliente) */
  canalEncarregado: () =>
    chamar((o) => client.privacidade.canalEncarregado(undefined, o)) as Promise<CanalEncarregado>,
  falarComEncarregado: (dados: { nome: string; email: string; assunto: string; mensagem: string }) =>
    chamar((o) => client.privacidade.falarComEncarregado(dados, o), 45000) as Promise<{
      ok: boolean;
      recebido_em: string;
      prazo_dias: number;
    }>,

  /* cobrança */

  /** Quatro estados possíveis: vitrine, teste, ativa, vencida. Quem decide é o servidor. */
  estadoCobranca: () =>
    chamar((o) => client.cobranca.estado(undefined, o)) as Promise<EstadoCobranca>,
  /** Devolve a URL do checkout da Stripe (cartão e Pix). A tela só redireciona. */
  assinar: (plano: "mensal" | "anual") =>
    chamar((o) => client.cobranca.assinar({ plano }, o), 45000) as Promise<{
      url: string;
      plano: string;
      assentos: number;
    }>,
  /** Portal da Stripe: trocar cartão, ver faturas, cancelar sem falar com ninguém. */
  portalCobranca: () =>
    chamar((o) => client.cobranca.portal(undefined, o), 45000) as Promise<{ url: string }>,
  /** Simulação de ativação em ambiente de sandbox/teste. */
  simularAtivacao: (dados: { plano: "mensal" | "anual"; assentos: number; atrasada?: boolean }) =>
    chamar((o) => client.cobranca.simularAtivacao(dados, o), 10000) as Promise<{
      sucesso: boolean;
      plano: string;
      assentos: number;
    }>,
  /** Simulação de cancelamento em ambiente de sandbox/teste. */
  simularCancelamento: () =>
    chamar((o) => client.cobranca.simularCancelamento(undefined, o), 10000) as Promise<{
      sucesso: boolean;
    }>,
};
