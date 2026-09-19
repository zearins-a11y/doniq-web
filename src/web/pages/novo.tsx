import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
  CloudOff,
  ListChecks,
  LoaderCircle,
  Pause,
  Play,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  type EstadoVoz,
  resolverEstadoVoz,
} from "../../shared/estado-voz";
import { FaixaCobranca } from "../components/faixa-cobranca";
import Ficha from "../components/ficha";
import { useMarcarPasso } from "../components/guia";
import { Mic, Parar } from "../components/icones";
import { ModalLgpd } from "../components/modal-lgpd";
import { OndaVoz } from "../components/onda-voz";
import useRecorder from "../hooks/use-recorder";
import useUploadQueue from "../hooks/use-upload-queue";
import {
  lerConsentimento,
  salvarConsentimento,
} from "../hooks/use-consentimento-lgpd";
import { type Relato, type TipoVisita, type Usuario, api } from "../lib/api";
import { aplicarTema, temaSalvo } from "../lib/tema";
import { Skeleton } from "../components/Skeleton";
import { clearDraft, loadDraft, saveDraft } from "../lib/upload-queue";
import { useDesktop } from "../hooks/use-desktop";
import { resolverVarianteFalar } from "../lib/variante-falar";
import {
  aplicarCampoRevisado,
  aplicarConfirmacaoRevisaoLocal,
  criarMudancasRevisao,
  type ChaveCampoRevisavel,
} from "../lib/revisao-relato";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const ONDA_VOZ = [
  0.28, 0.52, 0.78, 0.42, 0.9, 0.64, 1, 0.58, 0.84, 0.48, 0.7, 0.34,
] as const;

type CampoExtraido = {
  chave: ChaveCampoRevisavel;
  rotulo: string;
  valor: string;
  confianca: number;
  editavel: boolean;
};

function GravadorFalarAprovado({
  estado,
  gravando,
  pausado,
  segundos,
  nivelVoz,
  onAlternar,
  onPausar,
  onRetomar,
}: {
  estado: EstadoVoz;
  gravando: boolean;
  pausado: boolean;
  segundos: number;
  nivelVoz: number;
  onAlternar: () => void;
  onPausar: () => void;
  onRetomar: () => void;
}) {
  const rotuloEstado = {
    pronto: "Pronto",
    gravando: "Ao vivo",
    pausado: "Pausado",
    processando: "Enviando",
    offline: "Offline",
    concluido: "Concluído",
    erro: "Erro",
  }[estado];

  return (
    <div className={`falar-aprovado estado-${estado}`}>
      <div className="falar-aprovado-topo">
        <span>Falar · visita em andamento</span>
        <output
          className="falar-aprovado-estado"
          aria-live="polite"
          aria-atomic="true"
        >
          <span aria-hidden="true" />
          {rotuloEstado}
        </output>
      </div>

      <div className="falar-aprovado-centro">
        <time
          className="falar-aprovado-tempo"
          dateTime={`PT${segundos}S`}
          aria-label={`${segundos} segundos de gravação`}
        >
          {fmt(segundos)}
          <span>.00</span>
        </time>

        <OndaVoz
          className="falar-aprovado-onda"
          estado={estado}
          modo="nivel"
          ativa={gravando && !pausado}
          nivel={gravando && !pausado ? nivelVoz : 0}
          pausada={pausado}
        />

        <div className="falar-aprovado-controles">
          <button
            type="button"
            className={`falar-aprovado-botao${gravando && !pausado ? " is-recording" : ""}`}
            onClick={onAlternar}
            aria-label={gravando ? "Finalizar gravação" : "Gravar relato"}
            aria-pressed={gravando}
          >
            <span className="falar-aprovado-icone" aria-hidden="true">
              {gravando ? <i /> : <Mic />}
            </span>
          </button>

          {gravando && (
            <button
              type="button"
              className="falar-aprovado-pausa"
              onClick={pausado ? onRetomar : onPausar}
              aria-label={pausado ? "Retomar gravação" : "Pausar gravação"}
              aria-pressed={pausado}
            >
              {pausado ? <Play size={18} /> : <Pause size={18} />}
              <span>{pausado ? "Retomar" : "Pausar"}</span>
            </button>
          )}
        </div>
      </div>

      <p className="falar-aprovado-instrucao">
        {pausado
          ? "Gravação pausada · finalize ou retome quando estiver pronto"
          : gravando
            ? "Toque para parar · o áudio fica salvo"
          : estado === "erro"
            ? "Tente novamente ou escreva o relato"
            : estado === "offline"
              ? "Áudio salvo · o envio continua quando a conexão voltar"
              : estado === "processando"
                ? "Áudio salvo · preparando a transcrição"
                : estado === "concluido"
                  ? "Transcrição pronta · revise o relato abaixo"
                  : "Toque para gravar · fale do seu jeito"}
      </p>
    </div>
  );
}

/** Helper de desenvolvimento — remove em produção */
function buildMockRelato(transcricao: string) {
  return {
    relato_id: "dev-relato-1",
    user_id: "dev-user",
    transcricao,
    empresa: "Padaria São Bento",
    contato: "Carlos Mendes",
    cargo: "Proprietário",
    telefone: "(11) 99999-0000",
    resumo: "Falei com o Carlos sobre a nova linha de produtos.",
    resumo_narrativo: "Falei com o Carlos sobre a nova linha de produtos.",
    email_cliente: "carlos@padariasaobento.com.br",
    proximas_perguntas: ["Qual o volume médio semanal?"],
    objecao: "Preocupação com prazo de entrega",
    proxima_acao: "Enviar amostra até qua, 10.set",
    data_iso: new Date().toISOString(),
    hora: "14:30",
    temperatura: "quente",
    faltou_perguntar: [],
    followup: "",
    precisa_confirmar: true,
    campo_a_confirmar: "empresa",
    audio_ininteligivel: false,
    tags: [],
    concorrentes: [],
    numeros: [],
    evidencia: {},
    confianca: {
      empresa: "0.95",
      contato: "0.88",
      proxima_acao: "0.94",
      resumo: "0.72",
      objecao: "0.81",
    },
    revisado: false,
    campos_a_revisar: ["resumo"],
    tipo_visita: "prospeccao",
    roteiro: [],
    prompt_versao: "dev",
    modelo: "claude-sonnet-5",
    tokens_input: 120,
    tokens_output: 280,
    duracao_ms: 3200,
    cache_key: "dev-mock",
    created_at: new Date().toISOString(),
  } as Relato;
}

export default function Novo({
  usuario,
  onPerfil,
  onRelatoNovo,
  avisar,
  sinalPararDesktop = 0,
  visualFalarAprovado,
}: {
  usuario: Usuario;
  onPerfil: (u: Usuario) => void;
  onRelatoNovo: () => void;
  avisar: (m: string) => void;
  sinalPararDesktop?: number;
  visualFalarAprovado?: boolean;
}) {
  const reduzirMovimento = useReducedMotion();
  const desktop = useDesktop();
  const visualFalarAprovadoAtivo =
    visualFalarAprovado ??
    resolverVarianteFalar(
      typeof window === "undefined" ? "" : window.location.search,
    ) === "aprovada";
  const [empresaPreenchida] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("empresa") || "";
  });
  const [texto, setTexto] = useState("");
  const [relato, setRelato] = useState<Relato | null>(null);
  const [montando, setMontando] = useState(false);
  const [erro, setErro] = useState("");
  // Processing screen — campos extraídos com confiança
  const [processingReview, setProcessingReview] = useState<Relato | null>(null);
  const [processingCampos, setProcessingCampos] = useState<CampoExtraido[]>([]);
  const [confirmandoReview, setConfirmandoReview] = useState(false);
  const [erroReview, setErroReview] = useState("");
  // Done screen — "Falou, tá feito."
  const [doneReview, setDoneReview] = useState<Relato | null>(null);
  const [produto, setProduto] = useState(usuario.produto || "");
  const [vertical, setVertical] = useState(usuario.vertical || "geral");
  const [ramos, setRamos] = useState<{ id: string; rotulo: string }[]>([]);
  const [tipos, setTipos] = useState<TipoVisita[]>([]);
  const [roteiros, setRoteiros] = useState<Record<string, string[]>>({});
  const [tipo, setTipo] = useState("prospeccao");
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [erroCatalogo, setErroCatalogo] = useState("");
  const [verChecklist, setVerChecklist] = useState(false);
  const checklistId = useId();
  const textoAjudaId = useId();
  const textoErroId = useId();
  const seloGradienteId = useId();
  // roteiro do tipo escolhido; vem do servidor de uma vez e funciona sem rede depois
  const checklist = roteiros[tipo] ?? [];
  const quandoDoTipo = tipos.find((t) => t.id === tipo)?.quando;
  // Enquanto esta tela está no ar, a pessoa está em "Falar" — e a dica mais
  // específica que temos é a do tipo de visita escolhido.
  useMarcarPasso("falar", quandoDoTipo);

  // A etapa Feito ainda usa a composição escura legada. Revisar segue o tema escolhido.
  useEffect(() => {
    if (!doneReview) return;
    document.documentElement.setAttribute("data-tema", "escuro");
    const corFundo = getComputedStyle(document.documentElement)
      .getPropertyValue("--papel")
      .trim();
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", corFundo);
    return () => aplicarTema(temaSalvo());
  }, [doneReview]);

  // LGPD: mostra o modal antes de gravar áudio se não há consentimento válido
  const [mostrarLgpd, setMostrarLgpd] = useState(false);
  const [lgpdPronto, setLgpdPronto] = useState(false);

  const { pending, groups, working, online, enqueue, tentarDeNovo, descartar } =
    useUploadQueue({
      onGroupComplete: (t) => {
        setTexto((p) => (p ? p + " " + t : t));
        avisar("Áudio transcrito. Revise antes de montar o relatório.");
      },
    });

  const tentarGravar = () => {
    if (!lgpdPronto) {
      setMostrarLgpd(true);
      return;
    }
    gravador.alternar();
  };

  const handleLgpdAceitou = async () => {
    await salvarConsentimento(usuario.email);
    setLgpdPronto(true);
    setMostrarLgpd(false);
    // Só inicia gravação depois de salvar — evita race condition
    gravador.alternar();
  };

  const handleLgpdRecusou = () => {
    setMostrarLgpd(false);
    avisar("Sem áudio — use o campo de texto para escrever o relato.");
  };

  const gravador = useRecorder({
    onPronto: (blobs, mime, semSom) => void enqueue(blobs, mime, semSom),
  });
  const gravandoDesktop = gravador.gravando;
  const pararGravacaoDesktop = gravador.parar;
  const ultimoSinalPararDesktop = useRef(sinalPararDesktop);

  useEffect(() => {
    void desktop?.setRecording(gravandoDesktop).catch(() => {});
  }, [desktop, gravandoDesktop]);

  useEffect(
    () => () => {
      void desktop?.setRecording(false).catch(() => {});
    },
    [desktop],
  );

  useEffect(() => {
    if (ultimoSinalPararDesktop.current === sinalPararDesktop) return;
    ultimoSinalPararDesktop.current = sinalPararDesktop;
    if (gravandoDesktop) pararGravacaoDesktop();
  }, [gravandoDesktop, pararGravacaoDesktop, sinalPararDesktop]);

  useEffect(() => {
    void loadDraft().then((t) => t && setTexto(t));
  }, []);

  // LGPD: carrega estado de consentimento ao abrir
  useEffect(() => {
    setLgpdPronto(lerConsentimento(usuario.email));
  }, [usuario.email]);

  useEffect(() => {
    let vivo = true;
    setCarregandoCatalogo(true);
    const marcarErro = (msg: string) => vivo && setErroCatalogo(msg);
    api
      .verticais()
      .then((v) => {
        if (!vivo) return;
        setRamos(v.lista);
        setTipos(v.tipos);
        setRoteiros(v.roteiros);
        setTipo((t) => (v.roteiros[t] ? t : v.tipo_padrao));
      })
      .catch(() => marcarErro("Não foi possível carregar os tipos de visita."))
      .finally(() => vivo && setCarregandoCatalogo(false));
    return () => {
      vivo = false;
    };
  }, [usuario.vertical, setErroCatalogo, setCarregandoCatalogo]);
  useEffect(() => {
    // quem chegou por /ramos/opme já cai com o ramo escolhido no cadastro
    const pedido = new URLSearchParams(window.location.search).get("ramo");
    if (pedido && !usuario.produto) setVertical(pedido);
  }, [usuario.produto]);
  useEffect(() => {
    const t = setTimeout(() => void saveDraft(texto), 800);
    return () => clearTimeout(t);
  }, [texto]);

  const salvarProduto = useCallback(async () => {
    const u = await api.salvarPerfil({ produto, vertical });
    onPerfil(u);
    avisar("Produto salvo.");
  }, [produto, vertical, onPerfil, avisar]);

  const trocarRamo = useCallback(
    async (id: string) => {
      setVertical(id);
      if (!usuario.produto) return; // ainda no cadastro: salva junto com o produto
      const u = await api.salvarPerfil({ vertical: id });
      onPerfil(u);
      avisar("Ramo atualizado.");
    },
    [usuario.produto, onPerfil, avisar],
  );

  function construirCampos(r: Relato): CampoExtraido[] {
    const precisaRevisar = new Set(r.campos_a_revisar ?? []);
    const confiancaMap = r.confianca ?? {};

    const parseConf = (raw?: string): number => {
      if (!raw) return 70;
      const n = parseFloat(raw);
      if (isNaN(n)) return 70;
      return Math.round(n * 100);
    };

    const todos: CampoExtraido[] = [
      {
        chave: "empresa",
        rotulo: "Cliente",
        valor: r.empresa ?? "",
        confianca: parseConf(confiancaMap["empresa"]),
        editavel: true,
      },
      {
        chave: "contato",
        rotulo: "Contato",
        valor: r.contato ?? "",
        confianca: parseConf(confiancaMap["contato"]),
        editavel: true,
      },
      {
        chave: "proxima_acao",
        rotulo: "Próximo passo",
        valor: r.proxima_acao ?? "",
        confianca: parseConf(confiancaMap["proxima_acao"]),
        editavel: true,
      },
      {
        chave: "resumo",
        rotulo: "Resumo",
        valor: r.resumo ?? "",
        confianca: parseConf(confiancaMap["resumo"]),
        editavel: true,
      },
      {
        chave: "objecao",
        rotulo: "Objecção",
        valor: r.objecao ?? "",
        confianca: parseConf(confiancaMap["objecao"]),
        editavel: true,
      },
    ];

    // Marca como "low" os campos que a API pediu para rever
    return todos.map((c) => ({
      ...c,
      confianca: precisaRevisar.has(c.chave) ? 62 : c.confianca,
    }));
  }

  const montar = async () => {
    if (!texto.trim()) return;
    setMontando(true);
    setErro("");

    // Dev mock — remove em produção
    if (import.meta.env.DEV) {
      const mockRelato = buildMockRelato(texto.trim());
      setProcessingReview(mockRelato);
      setProcessingCampos(construirCampos(mockRelato));
      setMontando(false);
      return;
    }

    try {
      const clientId = crypto.randomUUID();
      const r = await api.criar(texto.trim(), clientId, tipo);
      setProcessingReview(r);
      setProcessingCampos(construirCampos(r));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setMontando(false);
    }
  };

  const confirmarRelatorio = async () => {
    if (!processingReview || confirmandoReview) return;
    setConfirmandoReview(true);
    setErroReview("");
    try {
      const revisado = import.meta.env.DEV
        ? aplicarConfirmacaoRevisaoLocal(processingReview)
        : await api.editar(
            processingReview.relato_id,
            criarMudancasRevisao(processingReview),
          );
      setProcessingReview(revisado);
      setProcessingCampos(construirCampos(revisado));
      setDoneReview(revisado);
    } catch (e) {
      setErroReview(
        `Não foi possível salvar as correções. O relatório continua aberto para revisão. ${(e as Error).message}`,
      );
    } finally {
      setConfirmandoReview(false);
    }
  };

  const atualizarCampoRevisado = (
    chave: ChaveCampoRevisavel,
    valor: string,
  ) => {
    if (erroReview) setErroReview("");
    setProcessingCampos((atuais) =>
      atuais.map((campo) =>
        campo.chave === chave ? { ...campo, valor } : campo,
      ),
    );
    setProcessingReview((atual) =>
      atual ? aplicarCampoRevisado(atual, chave, valor) : atual,
    );
  };

  const confirmarEIrFicha = async () => {
    if (!doneReview) return;
    setRelato(doneReview);
    setTexto("");
    setProcessingReview(null);
    setProcessingCampos([]);
    setDoneReview(null);
    await clearDraft();
    onRelatoNovo();
  };

  const voltarDoProcessing = () => {
    setErroReview("");
    setProcessingReview(null);
    setProcessingCampos([]);
  };

  const textoPreenchido = Boolean(texto.trim());
  const palavras = textoPreenchido ? texto.trim().split(/\s+/).length : 0;
  const estadoVoz = resolverEstadoVoz({
    erro: Boolean(gravador.erro),
    gravando: gravador.gravando,
    pausado: gravador.pausado,
    pendentes: pending,
    online,
    concluido: textoPreenchido,
  });
  const etapaAtual = gravador.gravando
    ? 0
    : montando
      ? 3
      : pending > 0
        ? 1
        : textoPreenchido
          ? 2
          : 0;
  const filaFalhou = groups.some((grupo) => grupo.failed > 0);
  const estadoVozRotulo = {
    pronto: "Pronto para ouvir",
    gravando: "Gravando agora",
    pausado: "Gravação pausada",
    processando: working
      ? "Transcrevendo áudio"
      : filaFalhou
        ? "Transcrição pendente"
        : "Áudio na fila",
    offline: "Salvo neste aparelho",
    concluido: "Transcrição concluída",
    erro: "Microfone indisponível",
  }[estadoVoz];
  const acaoGravacao = gravador.pausado
    ? "Finalizar e transcrever"
    : gravador.gravando
      ? "Parar e transcrever"
    : textoPreenchido || pending > 0
      ? "Adicionar outro trecho"
      : gravador.erro
        ? "Tentar microfone novamente"
        : "Gravar visita";
  const statusCaptura = gravador.pausado
    ? `Gravação pausada em ${fmt(gravador.segundos)}.`
    : gravador.gravando
      ? `Gravando relato. ${fmt(gravador.segundos)}.`
    : pending > 0
      ? `${pending} trecho${pending === 1 ? "" : "s"} de áudio na fila.`
      : textoPreenchido
        ? "Transcrição concluída e disponível para revisão."
        : "Gravação pronta.";
  const corSeloVoz =
    estadoVoz === "pronto" || estadoVoz === "processando"
      ? `url(#${seloGradienteId})`
      : estadoVoz === "offline"
        ? "var(--ocre)"
        : estadoVoz === "concluido"
          ? "var(--ok)"
          : "var(--carimbo)";

  // Restore theme on unmount

  // Done screen — "Falou, tá feito."
  if (doneReview) {
    return (
      <div className="novo-done">
        <div className="novo-mesh" aria-hidden="true" />
        <DoneScreen
          relato={doneReview}
          onRevisar={() => setDoneReview(null)}
          onConfirm={confirmarEIrFicha}
        />
      </div>
    );
  }

  // Processing screen — confidence-first extraction review
  if (processingReview) {
    return (
      <div className="novo-processing">
        <ProcessingScreen
          campos={processingCampos}
          onChange={atualizarCampoRevisado}
          onConfirm={() => void confirmarRelatorio()}
          onBack={voltarDoProcessing}
          confirmando={confirmandoReview}
          erro={erroReview}
        />
      </div>
    );
  }

  // Ficha — relatório revisado
  if (relato) {
    return (
      <Ficha
        relato={relato}
        avisar={avisar}
        onMudou={onRelatoNovo}
        onNovo={() => {
          setRelato(null);
          setErro("");
        }}
      />
    );
  }

  return (
    <>
      {/* Só aparece quando muda o que a pessoa pode fazer: teste acabando ou vencido. */}
      <FaixaCobranca contexto="novo" />

      {!usuario.produto && (
        // Cartão de abertura: fundo com um véu de acento para dizer "isto é
        // cadastro, não é a visita", e cada pergunta numa caixa própria. A
        // versão anterior era um empilhado de rótulo + campo + rótulo + campo,
        // e ninguém entendia que eram só duas perguntas.
        <div className="cartao abertura">
          <p className="rot-mono">só uma vez</p>
          <div className="bloco-tit">Antes de começar</div>
          <p className="sub">
            Duas respostas e a gente sai da sua frente. Dá pra mudar depois.
          </p>
          <div className="duo campos-abertura">
            <div className="caixa-campo">
              <label className="rot" htmlFor="prod">
                <b>1</b> O que você vende
              </label>
              <input
                id="prod"
                className="campo linha"
                value={produto}
                placeholder="ex: instrumentais cirúrgicos"
                aria-label="O que você vende"
                onChange={(e) => setProduto(e.target.value)}
              />
              <span className="dica-campo">Vira o assunto do follow-up.</span>
            </div>
            <div className="caixa-campo">
              <label className="rot" htmlFor="ramo">
                <b>2</b> Seu ramo
              </label>
              <select
                id="ramo"
                className="campo linha"
                value={vertical}
                onChange={(e) => void trocarRamo(e.target.value)}
              >
                {ramos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rotulo}
                  </option>
                ))}
              </select>
              <span className="dica-campo">
                Muda as perguntas que sugerimos.
              </span>
            </div>
          </div>
          <div className="linha-btns">
            <button
              className="btn2 ok"
              onClick={salvarProduto}
              disabled={!produto.trim()}
            >
              salvar
            </button>
          </div>
        </div>
      )}

      {/* Fluxo operacional: falar, organizar o áudio, revisar o rascunho e
          continuar no relatório estruturado. */}
      <section className="novo-fluxo" aria-labelledby="novo-pergunta">
        <header className="novo-intro">
          <ol className="etapas" aria-label="Etapas do relato">
            {(["Falar", "Organizar", "Revisar", "Continuar"] as const).map(
              (nome, i) => (
                <li
                  key={nome}
                  className={
                    i === etapaAtual ? "ativa" : i < etapaAtual ? "feita" : ""
                  }
                  aria-current={i === etapaAtual ? "step" : undefined}
                >
                  <span className="etapa-numero">{i + 1}</span>
                  {nome}
                </li>
              ),
            )}
          </ol>
          <p className="novo-sobretitulo">Memória fresca, relato preciso</p>
          <h2 className="pergunta" id="novo-pergunta">
            Como foi a visita?
          </h2>
          <p className="novo-resumo">
            Conte como aconteceu. A Doniq organiza os pontos comerciais para
            você revisar.
          </p>
        </header>

        {pending > 0 && (
          <div className="aviso novo-fila">
            <output
              className="novo-fila-status"
              aria-live="polite"
              aria-atomic="true"
            >
              <b>
                {!online
                  ? "Sem conexão"
                  : working
                    ? "Transcrevendo áudio"
                    : filaFalhou
                      ? "Não foi possível transcrever"
                      : "Áudio na fila"}
              </b>
              <span>
                {pending} trecho{pending === 1 ? "" : "s"} salvo
                {pending === 1 ? "" : "s"} neste aparelho
              </span>
            </output>
            <span className="novo-fila-explicacao">
              {!online
                ? "O envio continua sozinho quando a conexão voltar."
                : filaFalhou && !working
                  ? "O áudio continua salvo neste aparelho. Tente novamente quando quiser."
                  : "A transcrição entra no rascunho assim que terminar."}
            </span>
            {groups
              .filter((g) => g.failed > 0 && !working)
              .map((g) => (
                <span className="linha-btns" key={g.groupId}>
                  <button
                    className="btn2"
                    onClick={() => void tentarDeNovo(g.groupId)}
                  >
                    Tentar de novo
                  </button>
                  <button
                    className="btn2 perigo"
                    onClick={() => void descartar(g.groupId)}
                  >
                    Descartar áudio
                  </button>
                </span>
              ))}
          </div>
        )}

        <div className="novo-workspace">
          <section className="novo-captura" aria-label="Captura do relato">
            <div className="novo-bloco novo-bloco-voz">
              <div className="novo-secao-topo">
                <span className="novo-indice" aria-hidden="true">
                  01
                </span>
                <div>
                  <h3>Conte de memória</h3>
                  <p>
                    Fale nomes, decisões, objeções e próximos passos. Não
                    precisa organizar.
                  </p>
                </div>
              </div>

              {empresaPreenchida ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    marginBottom: 16,
                    borderRadius: 8,
                    background: "rgba(6, 182, 212, 0.08)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    fontSize: 13,
                    color: "var(--fg, var(--tinta))",
                  }}
                >
                  <span style={{ fontSize: 16 }} aria-hidden="true">
                    🗓️
                  </span>
                  <span>
                    Visita agendada para:{" "}
                    <strong style={{ color: "var(--frio)" }}>
                      {empresaPreenchida}
                    </strong>
                    {" "}· O relato gerado ficará associado a este cliente.
                  </span>
                </div>
              ) : null}

              {visualFalarAprovadoAtivo ? (
                <GravadorFalarAprovado
                  estado={estadoVoz}
                  gravando={gravador.gravando}
                  pausado={gravador.pausado}
                  segundos={gravador.segundos}
                  nivelVoz={gravador.nivelVoz}
                  onAlternar={tentarGravar}
                  onPausar={gravador.pausar}
                  onRetomar={gravador.retomar}
                />
              ) : (
                <div className={`mic-area estado-${estadoVoz}`}>
                  <output
                    className="novo-voz-estado"
                    aria-live="polite"
                    aria-atomic="true"
                    data-estado={estadoVoz}
                  >
                    <span className="novo-voz-estado-marca" aria-hidden="true">
                      {estadoVoz === "processando" ? (
                        <m.span
                          animate={
                            reduzirMovimento ? undefined : { rotate: 360 }
                          }
                          transition={{
                            duration: 0.8,
                            ease: "linear",
                            repeat: Infinity,
                          }}
                        >
                          <LoaderCircle size={14} />
                        </m.span>
                      ) : estadoVoz === "offline" ? (
                        <CloudOff size={14} />
                      ) : estadoVoz === "concluido" ? (
                        <Check size={14} />
                      ) : (
                        <span />
                      )}
                    </span>
                    <span>{estadoVozRotulo}</span>
                  </output>

                  <div className="selo-voz-cena">
                    <div
                      className="novo-pulso"
                      aria-hidden="true"
                      style={
                        {
                          "--nivel-voz":
                            gravador.gravando && !gravador.pausado
                            ? gravador.nivelVoz
                            : 0,
                        } as CSSProperties
                      }
                    >
                      {ONDA_VOZ.map((amplitude, i) => (
                        <span
                          key={i}
                          style={{ "--onda": amplitude } as CSSProperties}
                        />
                      ))}
                    </div>
                    <div className={`selo-voz estado-${estadoVoz}`}>
                      <svg
                        className="selo-voz-arco"
                        viewBox="0 0 144 148"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            id={seloGradienteId}
                            x1="22"
                            y1="116"
                            x2="120"
                            y2="24"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset="0%" stopColor="var(--grad1)" />
                            <stop offset="52%" stopColor="var(--grad2)" />
                            <stop offset="100%" stopColor="var(--grad3)" />
                          </linearGradient>
                        </defs>
                        <path
                          className="selo-voz-trilha"
                          d="M109 116A58 58 0 1 1 120 94M109 116l14 18"
                        />
                        <path
                          className="selo-voz-sinal"
                          d="M109 116A58 58 0 1 1 120 94M109 116l14 18"
                          stroke={corSeloVoz}
                        />
                      </svg>
                      <m.button
                        type="button"
                        className={
                          "mic" +
                          (gravador.gravando && !gravador.pausado ? " on" : "")
                        }
                        data-estado={estadoVoz}
                        onClick={tentarGravar}
                        aria-label={
                          gravador.gravando
                            ? "Finalizar gravação"
                            : "Gravar relato"
                        }
                        aria-pressed={gravador.gravando}
                        whileTap={
                          reduzirMovimento ? undefined : { scale: 0.985, y: 1 }
                        }
                        transition={{
                          type: "spring",
                          stiffness: 600,
                          damping: 34,
                        }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <m.span
                            key={gravador.gravando ? "parar" : "gravar"}
                            className="mic-icone"
                            initial={
                              reduzirMovimento
                                ? false
                                : { opacity: 0, scale: 0.9 }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{
                              duration: 0.14,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            {gravador.gravando ? <Parar /> : <Mic />}
                          </m.span>
                        </AnimatePresence>
                      </m.button>
                    </div>
                  </div>
                  {gravador.gravando && (
                    <button
                      type="button"
                      className="novo-gravacao-pausa"
                      onClick={
                        gravador.pausado ? gravador.retomar : gravador.pausar
                      }
                      aria-label={
                        gravador.pausado
                          ? "Retomar gravação"
                          : "Pausar gravação"
                      }
                      aria-pressed={gravador.pausado}
                    >
                      {gravador.pausado ? (
                        <Play size={16} aria-hidden="true" />
                      ) : (
                        <Pause size={16} aria-hidden="true" />
                      )}
                      {gravador.pausado ? "Retomar" : "Pausar"}
                    </button>
                  )}
                  <div className="novo-voz-status">
                    <AnimatePresence mode="wait" initial={false}>
                      <m.div
                        key={estadoVoz}
                        initial={
                          reduzirMovimento ? false : { opacity: 0, y: -5 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          reduzirMovimento
                            ? { opacity: 0 }
                            : { opacity: 0, y: 5 }
                        }
                        transition={{
                          duration: 0.16,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {gravador.gravando && (
                          <div className="cron">{fmt(gravador.segundos)}</div>
                        )}
                        <strong>{acaoGravacao}</strong>
                        <div
                          className={
                            "mic-txt" + (gravador.gravando ? " on" : "")
                          }
                        >
                          {gravador.pausado
                            ? "O cronômetro e as barras estão pausados."
                            : gravador.gravando
                              ? "Fale normalmente. As barras acompanham sua voz."
                            : pending > 0
                              ? "Você pode continuar enquanto o trecho anterior é organizado."
                              : "Toque no microfone e conte do seu jeito."}
                        </div>
                      </m.div>
                    </AnimatePresence>
                  </div>
                  <output
                    className="sr-only"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {statusCaptura}
                  </output>
                </div>
              )}

              {gravador.erro && (
                <div className="alerta novo-erro" role="alert">
                  {gravador.erro}
                </div>
              )}
            </div>

            <div className="novo-conector" aria-hidden="true">
              <span />
              <b>voz e texto formam o mesmo rascunho</b>
              <span />
            </div>

            <div className="novo-bloco novo-bloco-texto">
              <div className="novo-secao-topo">
                <span className="novo-indice" aria-hidden="true">
                  02
                </span>
                <div>
                  <h3>Revise o rascunho</h3>
                  <p>
                    A transcrição aparece aqui. Complete o que faltou antes de
                    organizar.
                  </p>
                </div>
              </div>

              <label className="rot novo-texto-label" htmlFor="txt">
                Relato da visita
              </label>
              <textarea
                id="txt"
                className="area novo-area"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  if (erro) setErro("");
                }}
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === "Enter" &&
                    textoPreenchido &&
                    !montando
                  ) {
                    e.preventDefault();
                    void montar();
                  }
                }}
                placeholder="Ex.: Falei com Marcelo, do CME. Achou o preço alto e está comparando com a Medstar. Pediu proposta até dia 12 para 40 unidades por mês."
                aria-label="Relato da visita"
                aria-describedby={`${textoAjudaId}${erro ? ` ${textoErroId}` : ""}`}
                aria-invalid={Boolean(erro)}
              />
              <div className="novo-texto-meta">
                <span>{palavras} palavras</span>
                {texto && (
                  <button
                    type="button"
                    className="novo-limpar"
                    onClick={() => setTexto("")}
                    aria-label="Limpar relato"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Limpar
                  </button>
                )}
              </div>

              {erro && (
                <div className="alerta novo-erro" id={textoErroId} role="alert">
                  Não foi possível montar o relatório. Seu rascunho continua
                  salvo. {erro}
                </div>
              )}

              <div className="novo-acao">
                <p id={textoAjudaId}>
                  {textoPreenchido
                    ? "Pronto para transformar este rascunho em um relatório revisável."
                    : "Grave ou escreva o que aconteceu para liberar a revisão."}
                </p>
                <m.button
                  type="button"
                  className="btn novo-revisar"
                  onClick={() => void montar()}
                  disabled={montando || !textoPreenchido}
                  whileTap={
                    reduzirMovimento || montando || !textoPreenchido
                      ? undefined
                      : { scale: 0.985, y: 1 }
                  }
                  transition={{ type: "spring", stiffness: 600, damping: 34 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <m.span
                      key={montando ? "montando" : "revisar"}
                      className="novo-revisar-conteudo"
                      initial={reduzirMovimento ? false : { opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 5 }
                      }
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {montando && (
                        <m.span
                          className="novo-spinner"
                          animate={
                            reduzirMovimento ? undefined : { rotate: 360 }
                          }
                          transition={{
                            duration: 0.8,
                            ease: "linear",
                            repeat: Infinity,
                          }}
                          aria-hidden="true"
                        >
                          <LoaderCircle size={18} />
                        </m.span>
                      )}
                      <span>
                        {montando
                          ? "Organizando relatório…"
                          : "Revisar relatório"}
                      </span>
                      {!montando && <ArrowRight size={19} aria-hidden="true" />}
                    </m.span>
                  </AnimatePresence>
                </m.button>
              </div>
            </div>
          </section>

          <aside
            className="novo-contexto"
            aria-labelledby="novo-contexto-titulo"
          >
            <div className="novo-contexto-topo">
              <span className="novo-contexto-icone" aria-hidden="true">
                <ListChecks size={19} />
              </span>
              <div>
                <p>Contexto da conversa</p>
                <h3 id="novo-contexto-titulo">Prepare a captura</h3>
              </div>
            </div>

            {carregandoCatalogo ? (
              <div
                className="novo-contexto-loading"
                aria-label="Carregando tipos de visita"
              >
                <Skeleton height={48} width="100%" delay={0} />
                <Skeleton height={48} width="100%" delay={100} />
                <Skeleton height={72} width="100%" delay={200} />
              </div>
            ) : erroCatalogo ? (
              <div className="alerta novo-erro-contexto" role="alert">
                <p>{erroCatalogo}</p>
                <button
                  className="btn2"
                  onClick={() => window.location.reload()}
                >
                  Tentar de novo
                </button>
              </div>
            ) : (
              <>
                {tipos.length > 0 && (
                  <fieldset className="tipos-visita">
                    <legend>Tipo de visita</legend>
                    <div className="tipos-visita-opcoes">
                      {tipos.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className={"chip-tipo" + (t.id === tipo ? " on" : "")}
                          aria-pressed={t.id === tipo}
                          onClick={() => setTipo(t.id)}
                        >
                          {t.rotulo}
                        </button>
                      ))}
                    </div>
                    <p className="tipo-quando">
                      {tipos.find((t) => t.id === tipo)?.quando ?? ""}
                    </p>
                  </fieldset>
                )}

                {checklist.length > 0 && (
                  <div className="novo-roteiro">
                    <button
                      type="button"
                      className="novo-roteiro-botao"
                      onClick={() => setVerChecklist((v) => !v)}
                      aria-expanded={verChecklist}
                      aria-controls={checklistId}
                    >
                      <span>
                        <b>Roteiro sugerido</b>
                        <small>{checklist.length} pontos para conferir</small>
                      </span>
                      <ChevronDown size={19} aria-hidden="true" />
                    </button>
                    <ol id={checklistId} hidden={!verChecklist}>
                      {checklist.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}

            <p className="novo-contexto-nota">
              Use como apoio. O relato continua sendo seu e pode ser editado
              antes de salvar.
            </p>
          </aside>
        </div>
      </section>

      {mostrarLgpd && (
        <ModalLgpd
          onAceitou={handleLgpdAceitou}
          onRecusou={handleLgpdRecusou}
        />
      )}
    </>
  );
}

/* ─── Processing Screen — confidence-first extraction review ─── */

type ProcessingScreenProps = {
  campos: CampoExtraido[];
  onChange: (chave: ChaveCampoRevisavel, valor: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  confirmando: boolean;
  erro: string;
};

function ProcessingScreen({
  campos,
  onChange,
  onConfirm,
  onBack,
  confirmando,
  erro,
}: ProcessingScreenProps) {
  const [tempoOrganizacao, setTempoOrganizacao] = useState(0);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTempoOrganizacao((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    tituloRef.current?.focus({ preventScroll: true });
  }, []);

  const ordenar = (a: CampoExtraido, b: CampoExtraido) =>
    a.confianca - b.confianca;
  const ordenados = [...campos].sort(ordenar);
  const precisamConfirmar = ordenados.filter((campo) => campo.confianca < 70);
  const jaPreenchidos = ordenados.filter((campo) => campo.confianca >= 70);

  return (
    <div className="novo-proc-card">
      <div className="novo-proc-head">
        <span className="novo-proc-selo" aria-hidden="true">
          <Check size={14} />
        </span>
        Confirme o essencial
      </div>
      <h2 ref={tituloRef} tabIndex={-1}>
        {precisamConfirmar.length > 0
          ? "Confirme o que ficou incerto"
          : "Revise os pontos principais"}
      </h2>
      <p>
        {precisamConfirmar.length > 0
          ? "Confira os campos destacados antes de gerar o relatório."
          : "Os principais dados foram preenchidos. Ajuste algum valor se necessário."}
      </p>

      {precisamConfirmar.length > 0 && (
        <section
          className="novo-proc-grupo"
          aria-labelledby="novo-proc-pendentes"
        >
          <div className="novo-proc-grupo-titulo">
            <h3 id="novo-proc-pendentes">Precisa confirmar</h3>
            <span>{precisamConfirmar.length}</span>
          </div>
          <div className="novo-extracts">
            {precisamConfirmar.map((campo) => (
              <CampoRow key={campo.chave} campo={campo} onChange={onChange} />
            ))}
          </div>
        </section>
      )}

      {jaPreenchidos.length > 0 && (
        <details className="novo-proc-confirmados">
          <summary>
            <span>Já preenchido</span>
            <small>{jaPreenchidos.length} campos</small>
          </summary>
          <div className="novo-extracts">
            {jaPreenchidos.map((campo) => (
              <CampoRow key={campo.chave} campo={campo} onChange={onChange} />
            ))}
          </div>
        </details>
      )}

      <div className="novo-proc-foot">
        <span>Tempo de revisão</span>
        <b>{fmt(tempoOrganizacao)}</b>
      </div>

      <div className="novo-proc-acoes">
        {erro && (
          <div className="alerta novo-proc-erro" role="alert">
            {erro}
          </div>
        )}
        <button
          className="novo-cta-primary"
          onClick={onConfirm}
          disabled={confirmando}
          aria-busy={confirmando}
        >
          {confirmando ? "Salvando correções…" : "Confirmar e gerar relatório"}
          {!confirmando && <ArrowRight size={18} aria-hidden="true" />}
        </button>
        <button
          className="novo-link-skip"
          onClick={onBack}
          disabled={confirmando}
        >
          Voltar e editar o rascunho
        </button>
      </div>
    </div>
  );
}

function CampoRow({
  campo,
  onChange,
}: {
  campo: CampoExtraido;
  onChange: (chave: ChaveCampoRevisavel, valor: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confNivel = campo.confianca < 70 ? "low" : "high";

  useEffect(() => {
    if (!editando) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editando]);

  const concluirEdicao = () => {
    setEditando(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const icone = {
    empresa: <UserRound size={14} />,
    contato: <UserRound size={14} />,
    proxima_acao: <ChevronRight size={14} />,
    resumo: <ListChecks size={14} />,
    objecao: <ChevronRight size={14} />,
  }[campo.chave] ?? <ListChecks size={14} />;

  return (
    <div className={`novo-extract is-${confNivel}`}>
      <div className="novo-extract-ic" aria-hidden="true">
        {icone}
      </div>
      <div className="novo-extract-body">
        <p className="novo-extract-k">{campo.rotulo}</p>
        {editando ? (
          <input
            ref={inputRef}
            className="novo-extract-v"
            value={campo.valor}
            aria-label={campo.rotulo}
            name={campo.chave}
            onChange={(e) => onChange(campo.chave, e.target.value)}
            onBlur={() => setEditando(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                concluirEdicao();
              }
            }}
          />
        ) : (
          <button
            ref={buttonRef}
            type="button"
            className="novo-extract-v novo-extract-edit"
            onClick={() => setEditando(true)}
            aria-label={`Editar ${campo.rotulo}: ${campo.valor || "não preenchido"}`}
          >
            {campo.valor || <em>Toque para preencher</em>}
          </button>
        )}
      </div>
      <span className="novo-conf">
        <span className="sr-only">Confiança: </span>
        {campo.confianca}%
      </span>
    </div>
  );
}

/* ─── Done Screen — "Falou, tá feito." ─── */

type DoneScreenProps = {
  relato: Relato;
  onRevisar: () => void;
  onConfirm: () => void;
};

function DoneScreen({ relato, onRevisar, onConfirm }: DoneScreenProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    tituloRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="novo-done-card">
      <div className="novo-check-ring">
        <Check size={30} strokeWidth={2.5} />
      </div>

      <h2 ref={tituloRef} tabIndex={-1}>
        Falou, tá feito.
      </h2>
      <p className="novo-done-sub">
        Visita registrada. Correções salvas. Relatório pronto para abrir.
      </p>

      <div className="novo-flow">
        <div className="novo-flow-top">
          <span>Falar</span>
          <span className="novo-flow-on">Revisar</span>
          <span className="novo-flow-on">Feito</span>
        </div>
        <div className="novo-flow-bar">
          <div className="novo-flow-fill" style={{ width: "100%" }} />
          <div className="novo-flow-nodes">
            <span className="novo-flow-node is-first" />
            <span className="novo-flow-node is-mid" />
            <span className="novo-flow-node is-last" />
          </div>
        </div>
      </div>

      <div className="novo-summary">
        <div className="novo-summary-row">
          <span className="k">Cliente</span>
          <span className="v">{relato.empresa || "—"}</span>
        </div>
        <div className="novo-summary-row">
          <span className="k">Relatório</span>
          <span className="v big">Pronto</span>
        </div>
        {relato.proxima_acao && (
          <div className="novo-summary-row">
            <span className="k">Próximo passo</span>
            <span className="v">{relato.proxima_acao}</span>
          </div>
        )}
      </div>

      <div className="novo-done-actions">
        <button className="novo-cta-primary" onClick={onConfirm}>
          Ver relatório completo
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="novo-btn-ghost" onClick={onRevisar}>
          Revisar relatório
        </button>
      </div>
    </div>
  );
}
