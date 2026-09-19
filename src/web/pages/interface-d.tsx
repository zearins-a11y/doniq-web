import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  CloudUpload,
  Clock3,
  FileText,
  History,
  Link2,
  List,
  LockKeyhole,
  LoaderCircle,
  Mail,
  MapPin,
  Mic,
  Pause,
  Play,
  Plug,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Square,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { IconeGoogle } from "../components/icone-google";
import { Marca } from "../components/marca";
import "./interface-d.css";

type Tela = "login" | "app";
type Aba = "novo" | "agenda" | "historico" | "crm" | "equipe";
type DirecaoVisual = "discreta" | "viva" | "hibrida";
type EstadoGravacao =
  | "idle"
  | "permission"
  | "recording"
  | "paused"
  | "saving"
  | "offline"
  | "uploading"
  | "transcribing"
  | "organizing"
  | "ready"
  | "reviewing"
  | "error";

const TRANSICAO_UI = {
  type: "spring" as const,
  stiffness: 305,
  damping: 33,
};

const ABAS = [
  { id: "novo", nome: "Novo", Icone: Mic },
  { id: "agenda", nome: "Agenda", Icone: CalendarDays, contagem: "3" },
  { id: "historico", nome: "Relatos", Icone: History },
  { id: "crm", nome: "CRM", Icone: Plug },
  { id: "equipe", nome: "Equipe", Icone: Users },
] as const;

const ETAPAS_VISITA = ["Falar", "Organizar", "Revisar", "Continuar"] as const;

const ESTADOS_GRAVACAO: ReadonlyArray<{ id: EstadoGravacao; nome: string }> = [
  { id: "idle", nome: "Pronto" },
  { id: "permission", nome: "Permissão" },
  { id: "recording", nome: "Gravando" },
  { id: "paused", nome: "Pausado" },
  { id: "saving", nome: "Salvo local" },
  { id: "offline", nome: "Offline" },
  { id: "uploading", nome: "Enviando" },
  { id: "transcribing", nome: "Transcrevendo" },
  { id: "organizing", nome: "Organizando" },
  { id: "ready", nome: "Revisar" },
  { id: "reviewing", nome: "Em revisão" },
  { id: "error", nome: "Erro" },
];

const DIRECOES_VISUAIS: ReadonlyArray<{
  id: DirecaoVisual;
  sigla: string;
  nome: string;
}> = [
  { id: "discreta", sigla: "A", nome: "Discreta" },
  { id: "viva", sigla: "B", nome: "Viva" },
  { id: "hibrida", sigla: "C", nome: "Híbrida" },
];

const CONTEUDO_ABA: Record<Exclude<Aba, "novo">, { titulo: string; descricao: string }> = {
  agenda: {
    titulo: "Agenda de retornos",
    descricao: "Organize compromissos, retornos e visitas que ainda precisam encontrar um dia.",
  },
  historico: {
    titulo: "Relatos de visita",
    descricao: "Retome decisões e próximos passos sem reabrir a conversa inteira.",
  },
  crm: {
    titulo: "Continuidade no CRM",
    descricao: "Acompanhe o caminho entre o relato revisado e o registro atualizado.",
  },
  equipe: {
    titulo: "Ritmo da equipe",
    descricao: "Acompanhe responsabilidade e consistência sem expor a conversa privada.",
  },
};

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_SETEMBRO = Array.from({ length: 35 }, (_, indice) =>
  indice === 0 || indice > 30 ? null : indice,
);

const AGENDA_VISITAS = [
  {
    hora: "09:30",
    empresa: "Rede Horizonte",
    contato: "Marina Lopes",
    tipo: "Retorno de proposta",
  },
  {
    hora: "14:30",
    empresa: "Casa Andrade",
    contato: "Roberto Melo",
    tipo: "Visita presencial",
  },
  {
    hora: "17:00",
    empresa: "Grupo Linha Sul",
    contato: "Cláudia Reis",
    tipo: "Alinhamento comercial",
  },
];

const RELATOS = [
  {
    id: "V-042",
    empresa: "Casa Andrade",
    contato: "Roberto Melo",
    data: "Hoje, 15:10",
    temperatura: "Quente",
    resumo: "Proposta aprovada com ajuste no prazo de implantação.",
    decisao: "Enviar versão revisada até amanhã, 11h.",
    proximo: "Retorno confirmado para quinta-feira.",
  },
  {
    id: "V-041",
    empresa: "Rede Horizonte",
    contato: "Marina Lopes",
    data: "Ontem, 17:42",
    temperatura: "Morno",
    resumo: "Equipe técnica avaliará a integração com o ERP atual.",
    decisao: "Compartilhar escopo técnico com o responsável de TI.",
    proximo: "Cobrar retorno em 5 dias.",
  },
  {
    id: "V-039",
    empresa: "Grupo Linha Sul",
    contato: "Cláudia Reis",
    data: "28 ago, 11:20",
    temperatura: "A conferir",
    resumo: "Concorrente citado durante a revisão de orçamento.",
    decisao: "Revisar diferencial de implantação assistida.",
    proximo: "Agendar conversa com compras.",
  },
] as const;

const EQUIPE = [
  { nome: "José Moreira", iniciais: "JM", visitas: 12, meta: 14, ritmo: 86, estado: "No ritmo" },
  { nome: "Marina Costa", iniciais: "MC", visitas: 10, meta: 12, ritmo: 83, estado: "No ritmo" },
  { nome: "Rafael Lima", iniciais: "RL", visitas: 7, meta: 12, ritmo: 58, estado: "Acompanhar" },
  { nome: "Ana Paula", iniciais: "AP", visitas: 5, meta: 8, ritmo: 63, estado: "Acompanhar" },
] as const;

function ControleSegmentado<T extends string>({
  valor,
  opcoes,
  onMudar,
  nome,
}: {
  valor: T;
  opcoes: ReadonlyArray<{ id: T; nome: string; Icone?: typeof CalendarDays }>;
  onMudar: (valor: T) => void;
  nome: string;
}) {
  return (
    <div className="d-segmented" aria-label={nome}>
      {opcoes.map(({ id, nome: rotulo, Icone }) => (
        <button key={id} type="button" aria-pressed={valor === id} onClick={() => onMudar(id)}>
          {valor === id && (
            <motion.i
              className="d-segmented-active"
              layoutId={`d-segmented-${nome}`}
              transition={TRANSICAO_UI}
              aria-hidden="true"
            />
          )}
          {Icone && <Icone size={15} aria-hidden="true" />}
          <span>{rotulo}</span>
        </button>
      ))}
    </div>
  );
}

function ControlePrototipo({
  tela,
  direcaoVisual,
  estadoGravacao,
  onMudar,
  onMudarDirecao,
  onMudarEstado,
}: {
  tela: Tela;
  direcaoVisual: DirecaoVisual;
  estadoGravacao: EstadoGravacao;
  onMudar: (tela: Tela) => void;
  onMudarDirecao: (direcao: DirecaoVisual) => void;
  onMudarEstado: (estado: EstadoGravacao) => void;
}) {
  const reduzirMovimento = useReducedMotion();

  return (
    <div className="d-prototype-bar">
      <nav className="d-prototype-pages" aria-label="Telas do protótipo">
        {(
          [
            ["login", "Login"],
            ["app", "Aplicativo"],
          ] as const
        ).map(([id, nome]) => (
          <button key={id} type="button" aria-pressed={tela === id} onClick={() => onMudar(id)}>
            {tela === id && (
              <motion.i
                className="d-prototype-indicator"
                layoutId="d-prototype-indicator"
                transition={TRANSICAO_UI}
                aria-hidden="true"
              />
            )}
            <span>{nome}</span>
          </button>
        ))}
      </nav>

      <fieldset className="d-prototype-direction">
        <legend className="d-sr-only">Direção visual</legend>
        {DIRECOES_VISUAIS.map(({ id, sigla, nome }) => (
          <button
            key={id}
            type="button"
            aria-label={`${sigla} — ${nome}`}
            aria-pressed={direcaoVisual === id}
            title={`${sigla} — ${nome}`}
            onClick={() => onMudarDirecao(id)}
          >
            {direcaoVisual === id && (
              <motion.i
                className="d-prototype-direction-indicator"
                layoutId="d-prototype-direction-indicator"
                transition={reduzirMovimento ? { duration: 0 } : TRANSICAO_UI}
                aria-hidden="true"
              />
            )}
            <strong>{sigla}</strong>
            <span className="d-direction-name">{nome}</span>
          </button>
        ))}
      </fieldset>

      {tela === "app" && (
        <label className="d-prototype-state">
          <span>Estado</span>
          <select
            id="d-prototype-state"
            name="prototype-state"
            aria-label="Estado do gravador"
            value={estadoGravacao}
            onChange={(event) => onMudarEstado(event.target.value as EstadoGravacao)}
          >
            {ESTADOS_GRAVACAO.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.nome}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function LoginPrototipo({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const enviar = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim().includes("@")) {
      setErro("Digite um e-mail válido para receber o código.");
      emailRef.current?.focus();
      return;
    }

    setErro("");
    setCarregando(true);
    window.setTimeout(() => {
      setCarregando(false);
      onEntrar();
    }, 650);
  };

  return (
    <main className="d-auth">
      <section className="d-auth-story" aria-labelledby="d-auth-title">
        <div className="d-auth-brand">
          <Marca largura={138} />
        </div>

        <div className="d-auth-copy">
          <p className="d-auth-kicker">Assistente pós-visita para representantes comerciais</p>
          <h1 id="d-auth-title">Terminou a visita. Terminou o trabalho.</h1>
          <p>
            Você fala enquanto a conversa ainda está fresca. O doniq organiza o relato para você
            revisar e continuar.
          </p>
        </div>

        <div className="d-auth-proof" aria-label="Exemplo de uma visita organizada pelo DONIQ">
          <div className="d-proof-head">
            <span>
              <i aria-hidden="true" />
              Visita 042
            </span>
            <span className="d-proof-time">01:42 de voz</span>
          </div>
          <div className="d-proof-wave" aria-hidden="true">
            {[8, 18, 30, 14, 38, 25, 12, 32, 20, 9, 27, 16].map((altura, indice) => (
              <i key={`${altura}-${indice}`} style={{ height: altura }} />
            ))}
          </div>
          <div className="d-proof-route" aria-hidden="true">
            {ETAPAS_VISITA.map((etapa, indice) => (
              <span key={etapa} data-active={indice === ETAPAS_VISITA.length - 1}>
                <i />
                {etapa}
              </span>
            ))}
          </div>
          <div className="d-proof-result">
            <div>
              <span>Decisão</span>
              <strong>Enviar proposta revisada</strong>
            </div>
            <div>
              <span>Próximo passo</span>
              <strong>Retorno na quinta-feira</strong>
            </div>
          </div>
        </div>

        <div className="d-trust-line">
          <ShieldCheck size={17} aria-hidden="true" />
          Sua fala continua privada. A equipe recebe somente a ficha que você revisar.
        </div>
      </section>

      <section className="d-auth-form-side" aria-labelledby="d-login-title">
        <form className="d-auth-form" onSubmit={enviar} noValidate>
          <div className="d-auth-mobile-brand">
            <Marca largura={124} />
            <span>Terminou a visita. Terminou o trabalho.</span>
          </div>
          <p className="d-form-context">Falou, tá feito.</p>
          <h2 id="d-login-title">Entre para continuar</h2>
          <p className="d-auth-intro">
            Use seu e-mail de trabalho. Enviaremos um código de acesso.
          </p>

          <div className="d-field">
            <label htmlFor="d-email">E-mail</label>
            <div className="d-field-control">
              <Mail size={18} aria-hidden="true" />
              <input
                ref={emailRef}
                id="d-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label="E-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? "d-email-error" : undefined}
                placeholder="voce@empresa.com.br"
              />
            </div>
          </div>

          <div className="d-field">
            <label htmlFor="d-name">
              Como devemos chamar você?
              <span>opcional</span>
            </label>
            <div className="d-field-control">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="d-name"
                name="name"
                type="text"
                autoComplete="name"
                aria-label="Como devemos chamar você?"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Seu primeiro nome"
              />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {erro && (
              <motion.p
                id="d-email-error"
                className="d-field-error"
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <AlertCircle size={15} aria-hidden="true" />
                {erro}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="d-button-primary"
            disabled={carregando}
            whileTap={carregando ? undefined : { y: 2 }}
            transition={{ duration: 0.08 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={carregando ? "loading" : "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.14 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
              >
                {carregando && <LoaderCircle size={18} className="d-spin" aria-hidden="true" />}
                {carregando ? "Enviando código..." : "Receber código"}
                {!carregando && <ArrowRight size={18} aria-hidden="true" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <div className="d-auth-divider">ou entre com</div>

          <button type="button" className="d-button-secondary">
            <IconeGoogle size={19} />
            Continuar com Google
          </button>

          <p className="d-auth-legal">
            Sem senha. O código vale por 10 minutos. Ao continuar, você concorda com a{" "}
            <a href="/privacidade">política de privacidade</a>.
          </p>
        </form>
      </section>
    </main>
  );
}

const PROXIMO_ESTADO: Partial<Record<EstadoGravacao, EstadoGravacao>> = {
  saving: "uploading",
  uploading: "transcribing",
  transcribing: "organizing",
  organizing: "ready",
};

function Gravador({
  estado,
  onMudarEstado,
}: {
  estado: EstadoGravacao;
  onMudarEstado: (estado: EstadoGravacao) => void;
}) {
  const [segundos, setSegundos] = useState(0);
  const reduzirMovimento = useReducedMotion();
  const botaoGravacaoRef = useRef<HTMLButtonElement>(null);
  const focarQuandoProntoRef = useRef(false);

  useEffect(() => {
    if (estado !== "recording") return;
    const interval = window.setInterval(() => setSegundos((valor) => valor + 1), 1000);
    return () => window.clearInterval(interval);
  }, [estado]);

  useEffect(() => {
    const proximo = PROXIMO_ESTADO[estado];
    if (!proximo) return;

    const duracao = estado === "saving" ? 700 : estado === "organizing" ? 1100 : 900;
    const timeout = window.setTimeout(() => onMudarEstado(proximo), duracao);
    return () => window.clearTimeout(timeout);
  }, [estado, onMudarEstado]);

  useEffect(() => {
    if (estado !== "ready" || !focarQuandoProntoRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      botaoGravacaoRef.current?.focus();
      focarQuandoProntoRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [estado]);

  const agir = () => {
    const proximo: Partial<Record<EstadoGravacao, EstadoGravacao>> = {
      idle: "recording",
      permission: "recording",
      recording: "paused",
      paused: "recording",
      offline: "uploading",
      ready: "reviewing",
      reviewing: "idle",
      error: "saving",
    };

    const destino = proximo[estado];
    if (!destino) return;
    if (estado === "idle" || estado === "permission" || estado === "reviewing") setSegundos(0);
    onMudarEstado(destino);
  };

  const finalizar = () => {
    focarQuandoProntoRef.current = true;
    onMudarEstado("saving");
  };

  const minutos = Math.floor(segundos / 60)
    .toString()
    .padStart(2, "0");
  const segundosRestantes = (segundos % 60).toString().padStart(2, "0");

  const copia = {
    idle: {
      status: "Pronto neste aparelho",
      titulo: "Fale. O doniq organiza.",
      descricao: "Conte como foi a visita. Você revisa tudo antes de continuar.",
      acao: "Começar gravação",
      dica: "O áudio fica neste aparelho até o envio.",
      Icone: Mic,
      tom: "brand",
      progresso: 0.22,
    },
    permission: {
      status: "Microfone bloqueado",
      titulo: "Permita o acesso ao microfone",
      descricao: "O doniq usa o microfone somente enquanto você estiver gravando esta visita.",
      acao: "Permitir microfone",
      dica: "Você poderá revogar a permissão nos ajustes do navegador.",
      Icone: Mic,
      tom: "warning",
      progresso: 0.22,
    },
    recording: {
      status: "Gravando",
      titulo: "Pode continuar falando",
      descricao: "A gravação está sendo preservada localmente enquanto você fala.",
      acao: "Pausar gravação",
      dica: "Nada será compartilhado sem sua revisão.",
      Icone: Pause,
      tom: "danger",
      progresso: 0.22,
    },
    paused: {
      status: "Pausado",
      titulo: "Gravação pausada",
      descricao: "Continue de onde parou ou finalize para organizar o relato.",
      acao: "Continuar gravação",
      dica: "O trecho gravado continua salvo neste aparelho.",
      Icone: Play,
      tom: "danger",
      progresso: 0.22,
    },
    saving: {
      status: "Salvando no aparelho",
      titulo: "Protegendo a gravação",
      descricao: "Primeiro salvamos localmente. Depois iniciamos o envio seguro.",
      acao: "Salvando gravação",
      dica: "Você pode fechar esta etapa sem perder o áudio.",
      Icone: LoaderCircle,
      tom: "warning",
      progresso: 0.38,
    },
    offline: {
      status: "Salvo localmente",
      titulo: "Sem conexão. Nada foi perdido.",
      descricao: "O relato permanece neste aparelho e entrará na fila quando a conexão voltar.",
      acao: "Tentar enviar agora",
      dica: "Você pode continuar trabalhando offline.",
      Icone: CloudOff,
      tom: "warning",
      progresso: 0.38,
    },
    uploading: {
      status: "Enviando com segurança",
      titulo: "Conexão restabelecida",
      descricao: "O áudio salvo está sendo enviado para continuar o processamento.",
      acao: "Enviando gravação",
      dica: "O arquivo local será mantido até a confirmação.",
      Icone: CloudUpload,
      tom: "brand",
      progresso: 0.5,
    },
    transcribing: {
      status: "Transcrevendo",
      titulo: "Transformando fala em texto",
      descricao: "A transcrição permanece privada e serve de base para a ficha.",
      acao: "Transcrevendo visita",
      dica: "Você acompanha a etapa real, sem estimativas imprecisas.",
      Icone: LoaderCircle,
      tom: "brand",
      progresso: 0.62,
    },
    organizing: {
      status: "Organizando",
      titulo: "Separando o que importa",
      descricao: "Decisões, objeções e próximos passos estão sendo preparados para revisão.",
      acao: "Organizando relato",
      dica: "Seu áudio já está preservado.",
      Icone: LoaderCircle,
      tom: "brand",
      progresso: 0.75,
    },
    ready: {
      status: "Pronto para revisão",
      titulo: "A visita está organizada",
      descricao: "A ficha está pronta para revisão. A transcrição continua privada.",
      acao: "Revisar relato",
      dica: "Confirme o conteúdo antes de compartilhar.",
      Icone: Check,
      tom: "success",
      progresso: 0.9,
    },
    reviewing: {
      status: "Revisão privada",
      titulo: "Confira antes de compartilhar",
      descricao: "Esta etapa abrirá a ficha com decisões, objeções e próximos passos editáveis.",
      acao: "Concluir demonstração",
      dica: "Nenhum conteúdo foi enviado neste protótipo.",
      Icone: FileText,
      tom: "success",
      progresso: 1,
    },
    error: {
      status: "Envio interrompido",
      titulo: "O áudio continua salvo",
      descricao: "Não conseguimos continuar o processamento, mas sua gravação permanece segura.",
      acao: "Tentar novamente",
      dica: "Se o erro persistir, você poderá exportar o áudio.",
      Icone: RefreshCw,
      tom: "danger",
      progresso: 0.38,
    },
  }[estado];

  const IconeEstado = copia.Icone;
  const emProcessamento = ["saving", "uploading", "transcribing", "organizing"].includes(estado);
  const expandido = estado === "ready" || estado === "reviewing";

  return (
    <section className="d-recorder" aria-labelledby="d-recorder-title" aria-busy={emProcessamento}>
      <div className="d-recorder-register">
        <span>
          <i aria-hidden="true" />
          Registro da visita
        </span>
        <span className="d-recorder-id">V-042</span>
      </div>

      <motion.div
        className="d-recorder-status"
        data-state={estado}
        data-tone={copia.tom}
        layout
        transition={TRANSICAO_UI}
        aria-live="polite"
      >
        <i aria-hidden="true" />
        {copia.status}
        {(estado === "recording" || estado === "paused") && (
          <span className="d-recorder-time" aria-hidden="true">
            {minutos}:{segundosRestantes}
          </span>
        )}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={estado}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          style={{ display: "contents" }}
        >
          <h2 id="d-recorder-title">{copia.titulo}</h2>
          <p>{copia.descricao}</p>
        </motion.div>
      </AnimatePresence>

      <div className="d-record-stage" data-tone={copia.tom}>
        <AnimatePresence initial={false}>
          {(estado === "ready" || estado === "reviewing") && (
            <motion.div
              className="d-structured-results"
              initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden="true"
            >
              {[
                { nome: "Decisão", classe: "decision" },
                { nome: "Objeção", classe: "objection" },
                { nome: "Próximo passo", classe: "next" },
              ].map((item, indice) => (
                <motion.span
                  key={item.nome}
                  className={item.classe}
                  initial={
                    reduzirMovimento
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          x: indice === 0 ? -12 : 12,
                          y: 8,
                        }
                  }
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{
                    duration: 0.24,
                    delay: reduzirMovimento ? 0 : indice * 0.055,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <i />
                  {item.nome}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.svg
          className="d-voice-seal"
          viewBox="0 0 200 200"
          aria-hidden="true"
          animate={{ rotate: reduzirMovimento ? 0 : estado === "recording" ? 4 : 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <circle className="d-voice-seal-track" cx="100" cy="100" r="82" pathLength="1" />
          <motion.circle
            className="d-voice-seal-progress"
            cx="100"
            cy="100"
            r="82"
            pathLength="1"
            initial={false}
            animate={{ pathLength: copia.progresso }}
            transition={{ duration: reduzirMovimento ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          />
          <path className="d-voice-seal-tail" d="M151 151 L170 170" />
        </motion.svg>

        <motion.button
          ref={botaoGravacaoRef}
          layout
          type="button"
          className="d-record-button"
          data-state={estado}
          data-tone={copia.tom}
          data-expanded={expandido}
          onClick={agir}
          disabled={emProcessamento}
          aria-label={copia.acao}
          transition={TRANSICAO_UI}
          whileTap={emProcessamento ? undefined : { y: 2 }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={estado}
              initial={
                reduzirMovimento ? { opacity: 0 } : { opacity: 0, scale: 0.32, filter: "blur(3px)" }
              }
              animate={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                rotate: emProcessamento && !reduzirMovimento ? 360 : 0,
              }}
              exit={
                reduzirMovimento ? { opacity: 0 } : { opacity: 0, scale: 0.4, filter: "blur(3px)" }
              }
              transition={
                emProcessamento && !reduzirMovimento
                  ? { rotate: { duration: 0.9, repeat: Infinity, ease: "linear" } }
                  : TRANSICAO_UI
              }
              className="d-record-button-content"
            >
              <IconeEstado
                size={expandido ? 21 : estado === "recording" ? 30 : 35}
                aria-hidden="true"
              />
              {expandido && <strong>{copia.acao}</strong>}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <div
        className="d-wave"
        data-active={estado === "recording"}
        data-paused={estado === "paused"}
        data-tone={copia.tom}
        aria-hidden="true"
      >
        {[8, 16, 25, 13, 30, 20, 10, 23, 15, 7, 18].map((altura, indice) => (
          <span key={`${altura}-${indice}`} style={{ height: altura }} />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${estado}-copy`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {!expandido && <div className="d-recorder-action">{copia.acao}</div>}
          <div className="d-recorder-hint">{copia.dica}</div>
        </motion.div>
      </AnimatePresence>

      {(estado === "recording" || estado === "paused") && (
        <button type="button" className="d-recorder-finish" onClick={finalizar}>
          <Square size={15} aria-hidden="true" />
          Finalizar e organizar
        </button>
      )}

      {estado === "error" && (
        <div className="d-recorder-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          Código de suporte: DV-204
        </div>
      )}
    </section>
  );
}

function AgendaPrototipo() {
  const [visualizacao, setVisualizacao] = useState<"calendario" | "lista">("calendario");
  const [diaSelecionado, setDiaSelecionado] = useState(2);
  const [mes, setMes] = useState(1);
  const meses = ["Agosto 2026", "Setembro 2026", "Outubro 2026"];
  const diasComVisita = new Set([2, 4, 8, 11, 17, 23, 29]);

  return (
    <section className="d-operational d-agenda" aria-label="Agenda de visitas">
      <div className="d-operational-toolbar">
        <div className="d-period-control" aria-label="Navegação mensal">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMes(Math.max(0, mes - 1))}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <strong>{meses[mes]}</strong>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMes(Math.min(meses.length - 1, mes + 1))}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <ControleSegmentado
          nome="visualizacao-agenda"
          valor={visualizacao}
          onMudar={setVisualizacao}
          opcoes={[
            { id: "calendario", nome: "Calendário", Icone: CalendarDays },
            { id: "lista", nome: "Lista", Icone: List },
          ]}
        />
      </div>

      <div className="d-agenda-layout">
        <div className="d-agenda-primary">
          <div className="d-agenda-summary" aria-label="Resumo da agenda">
            <div className="d-agenda-today">
              <span>Hoje</span>
              <strong>02</strong>
              <small>quarta-feira</small>
            </div>
            <div>
              <strong>3 visitas</strong>
              <span>9h30 até 17h</span>
            </div>
            <div>
              <strong>2 retornos</strong>
              <span>vindos de relatos</span>
            </div>
            <div>
              <strong>1 sem data</strong>
              <span>precisa de decisão</span>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {visualizacao === "calendario" ? (
              <motion.div
                key="calendario"
                className="d-calendar"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <div className="d-calendar-weekdays" aria-hidden="true">
                  {DIAS_SEMANA.map((dia) => (
                    <span key={dia}>{dia}</span>
                  ))}
                </div>
                <div className="d-calendar-grid">
                  {DIAS_SETEMBRO.map((dia, indice) =>
                    dia ? (
                      <button
                        key={dia}
                        type="button"
                        className="d-calendar-day"
                        data-today={dia === 2}
                        data-has-event={diasComVisita.has(dia)}
                        aria-pressed={diaSelecionado === dia}
                        aria-label={`${dia} de setembro${diasComVisita.has(dia) ? ", com compromisso" : ""}`}
                        onClick={() => setDiaSelecionado(dia)}
                      >
                        {diaSelecionado === dia && (
                          <motion.i
                            className="d-calendar-selection"
                            layoutId="d-calendar-selection"
                            transition={TRANSICAO_UI}
                            aria-hidden="true"
                          />
                        )}
                        <span>{dia}</span>
                        {diasComVisita.has(dia) && <b aria-hidden="true" />}
                      </button>
                    ) : (
                      <span
                        key={`vazio-${indice}`}
                        className="d-calendar-empty"
                        aria-hidden="true"
                      />
                    ),
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lista"
                className="d-agenda-list-view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {AGENDA_VISITAS.map((visita) => (
                  <article key={visita.hora}>
                    <time>{visita.hora}</time>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{visita.empresa}</strong>
                      <p>
                        {visita.tipo} com {visita.contato}
                      </p>
                    </div>
                    <button type="button" aria-label={`Abrir visita à ${visita.empresa}`}>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="d-agenda-side" aria-labelledby="d-agenda-day-title">
          <div className="d-side-heading">
            <span className="d-section-index">02 SET</span>
            <h2 id="d-agenda-day-title">Próximas visitas</h2>
          </div>
          <ol className="d-visit-route">
            {AGENDA_VISITAS.map((visita, indice) => (
              <li key={visita.hora} data-current={indice === 1}>
                <time>{visita.hora}</time>
                <div>
                  <strong>{visita.empresa}</strong>
                  <span>{visita.contato}</span>
                  <small>{visita.tipo}</small>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="d-unscheduled">
            <CalendarClock size={18} aria-hidden="true" />
            <span>
              <strong>Definir data para Mercado Alto</strong>
              <small>Próximo passo criado no relato V-038</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </aside>
      </div>
    </section>
  );
}

function RelatosPrototipo() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"Todos" | "Quente" | "Morno" | "A conferir">("Todos");
  const [aberto, setAberto] = useState<string>("V-042");
  const relatosFiltrados = RELATOS.filter((relato) => {
    const correspondeFiltro = filtro === "Todos" || relato.temperatura === filtro;
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const correspondeBusca =
      !termo ||
      [relato.empresa, relato.contato, relato.resumo, relato.decisao]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    return correspondeFiltro && correspondeBusca;
  });

  return (
    <section className="d-operational d-reports" aria-label="Histórico de relatos">
      <div className="d-report-search">
        <Search size={19} aria-hidden="true" />
        <label htmlFor="d-report-query">Buscar nos relatos</label>
        <input
          id="d-report-query"
          name="report-query"
          type="search"
          aria-label="Buscar nos relatos"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Empresa, contato, objeção ou concorrente"
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="d-report-controls">
        <div className="d-report-filters" aria-label="Filtrar por temperatura">
          {(["Todos", "Quente", "Morno", "A conferir"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filtro === item}
              onClick={() => setFiltro(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <p>
          <strong>{relatosFiltrados.length}</strong> relatos encontrados
        </p>
      </div>

      <div className="d-report-layout">
        <div className="d-report-timeline">
          <div className="d-timeline-label">
            <span>Esta semana</span>
            <i aria-hidden="true" />
          </div>
          {relatosFiltrados.length ? (
            relatosFiltrados.map((relato) => {
              const expandido = aberto === relato.id;
              const conteudoId = `d-report-${relato.id}`;
              return (
                <article key={relato.id} className="d-report-entry" data-expanded={expandido}>
                  <button
                    type="button"
                    aria-expanded={expandido}
                    aria-controls={conteudoId}
                    onClick={() => setAberto(expandido ? "" : relato.id)}
                  >
                    <span className="d-report-id">{relato.id}</span>
                    <span className="d-report-main">
                      <strong>{relato.empresa}</strong>
                      <span>{relato.resumo}</span>
                    </span>
                    <span className="d-temperature" data-temperature={relato.temperatura}>
                      <i aria-hidden="true" />
                      {relato.temperatura}
                    </span>
                    <span className="d-report-time">{relato.data}</span>
                    <motion.span animate={{ rotate: expandido ? 180 : 0 }} aria-hidden="true">
                      <ChevronDown size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {expandido && (
                      <motion.div
                        id={conteudoId}
                        className="d-report-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div>
                          <span>Decisão</span>
                          <strong>{relato.decisao}</strong>
                        </div>
                        <div>
                          <span>Próximo passo</span>
                          <strong>{relato.proximo}</strong>
                        </div>
                        <button type="button">
                          Abrir ficha
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })
          ) : (
            <div className="d-report-empty">
              <Search size={22} aria-hidden="true" />
              <strong>Nenhum relato encontrado</strong>
              <span>Ajuste a busca ou selecione outro filtro.</span>
            </div>
          )}
        </div>

        <aside className="d-report-summary" aria-label="Resumo dos relatos">
          <div>
            <span>Total revisado</span>
            <strong>18</strong>
            <small>12 neste ciclo</small>
          </div>
          <div>
            <span>Oportunidades quentes</span>
            <strong>5</strong>
            <small>2 pedem retorno hoje</small>
          </div>
          <div className="d-report-review">
            <AlertCircle size={18} aria-hidden="true" />
            <span>
              <strong>2 itens a conferir</strong>
              <small>Revise antes de compartilhar com a equipe.</small>
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CrmPrototipo() {
  const [pausado, setPausado] = useState(false);
  const [ultimaVerificacao, setUltimaVerificacao] = useState("agora");
  const [enviando, setEnviando] = useState(false);

  const testarConexao = () => {
    setEnviando(true);
    window.setTimeout(() => {
      setEnviando(false);
      setUltimaVerificacao("há poucos segundos");
    }, 700);
  };

  const etapas = [
    { titulo: "Relato revisado", detalhe: "V-042", Icone: FileText },
    { titulo: "Campos mapeados", detalhe: "4 campos", Icone: Link2 },
    { titulo: "CRM atualizado", detalhe: "Casa Andrade", Icone: Building2 },
  ];

  return (
    <section className="d-operational d-crm" aria-label="Integrações com CRM">
      <div className="d-crm-overview">
        <div className="d-crm-metric">
          <span>Relatos enviados</span>
          <strong>24</strong>
          <small>
            <TrendingUp size={14} aria-hidden="true" /> 6 nesta semana
          </small>
        </div>
        <div className="d-crm-metric">
          <span>Campos atualizados</span>
          <strong>96</strong>
          <small>4 por relato, em média</small>
        </div>
        <div className="d-crm-metric">
          <span>Precisam de atenção</span>
          <strong>1</strong>
          <small>Mapeamento incompleto</small>
        </div>
      </div>

      <div className="d-crm-layout">
        <div className="d-crm-flow">
          <div className="d-flow-heading">
            <div>
              <span className="d-section-index">FLUXO ATIVO</span>
              <h2>Do relato revisado ao Pipedrive</h2>
            </div>
            <span className="d-connection-state" data-paused={pausado}>
              {pausado ? (
                <AlertCircle size={15} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={15} aria-hidden="true" />
              )}
              {pausado ? "Pausado" : "Saudável"}
            </span>
          </div>

          <ol className="d-sync-route">
            {etapas.map(({ titulo, detalhe, Icone }, indice) => (
              <li key={titulo} data-complete={!pausado || indice === 0}>
                <span className="d-sync-route-icon">
                  <Icone size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>{titulo}</strong>
                  <span>{detalhe}</span>
                </div>
                {indice < etapas.length - 1 && <i aria-hidden="true" />}
              </li>
            ))}
          </ol>

          <div className="d-crm-last-run">
            <Activity size={18} aria-hidden="true" />
            <div>
              <strong>Última verificação: {ultimaVerificacao}</strong>
              <span>Negócio atualizado em 1,8 segundo. Nenhuma ação pendente.</span>
            </div>
            <button type="button" onClick={testarConexao} disabled={enviando}>
              <RefreshCw size={16} className={enviando ? "d-spin" : undefined} aria-hidden="true" />
              {enviando ? "Testando" : "Testar conexão"}
            </button>
          </div>
        </div>

        <aside className="d-crm-connection" aria-labelledby="d-crm-provider-title">
          <div className="d-provider-mark" aria-hidden="true">
            P
          </div>
          <div>
            <span className="d-section-index">CONEXÃO PRINCIPAL</span>
            <h2 id="d-crm-provider-title">Pipedrive</h2>
            <p>Organização, pessoa, negócio e próxima atividade sincronizados.</p>
          </div>
          <button
            type="button"
            className="d-connection-toggle"
            aria-pressed={!pausado}
            onClick={() => setPausado((valor) => !valor)}
          >
            <span aria-hidden="true">
              <motion.i layout transition={TRANSICAO_UI} />
            </span>
            {pausado ? "Retomar envio" : "Envio automático"}
          </button>
        </aside>
      </div>

      <div className="d-provider-list" aria-label="Outros provedores">
        <div>
          <span className="d-provider-symbol">H</span>
          <span>
            <strong>HubSpot</strong>
            <small>Disponível para conectar</small>
          </span>
          <button type="button">
            Configurar <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <div>
          <span className="d-provider-symbol">PL</span>
          <span>
            <strong>Ploomes</strong>
            <small>Mapeamento salvo, conexão pausada</small>
          </span>
          <button type="button">
            Revisar <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

function EquipePrototipo() {
  const [periodo, setPeriodo] = useState<"7 dias" | "30 dias">("7 dias");
  const [conviteAberto, setConviteAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  const enviarConvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) return;
    setEnviado(true);
  };

  return (
    <section className="d-operational d-team" aria-label="Gestão da equipe">
      <div className="d-team-toolbar">
        <ControleSegmentado
          nome="periodo-equipe"
          valor={periodo}
          onMudar={setPeriodo}
          opcoes={[
            { id: "7 dias", nome: "7 dias" },
            { id: "30 dias", nome: "30 dias" },
          ]}
        />
        <button
          type="button"
          className="d-primary-action"
          onClick={() => {
            setConviteAberto((valor) => !valor);
            setEnviado(false);
          }}
        >
          <UserPlus size={17} aria-hidden="true" />
          Convidar pessoa
        </button>
      </div>

      <AnimatePresence initial={false}>
        {conviteAberto && (
          <motion.form
            className="d-invite-form"
            onSubmit={enviarConvite}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {enviado ? (
              <output className="d-invite-success">
                <CheckCircle2 size={19} aria-hidden="true" />
                <span>
                  <strong>Convite preparado</strong>
                  <small>{email} receberá acesso como representante.</small>
                </span>
              </output>
            ) : (
              <>
                <label htmlFor="d-team-email">E-mail de trabalho</label>
                <input
                  id="d-team-email"
                  name="team-email"
                  type="email"
                  aria-label="E-mail de trabalho para convite"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="pessoa@empresa.com.br"
                  required
                />
                <button type="submit">
                  <Send size={16} aria-hidden="true" /> Enviar convite
                </button>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      <div className="d-team-layout">
        <div className="d-team-rhythm">
          <div className="d-rhythm-hero">
            <span>Ritmo do ciclo</span>
            <strong>{periodo === "7 dias" ? "78%" : "84%"}</strong>
            <p>
              {periodo === "7 dias"
                ? "34 de 46 visitas planejadas já foram registradas."
                : "128 de 152 visitas planejadas já foram registradas."}
            </p>
            <div
              className="d-rhythm-track"
              aria-label={`${periodo === "7 dias" ? "78" : "84"}% das visitas planejadas registradas`}
            >
              <motion.i
                initial={false}
                animate={{ scaleX: periodo === "7 dias" ? 0.78 : 0.84 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <div className="d-team-people" aria-label="Ritmo por pessoa">
            {EQUIPE.map((pessoa) => (
              <article key={pessoa.nome} data-state={pessoa.estado}>
                <span className="d-team-avatar" aria-hidden="true">
                  {pessoa.iniciais}
                </span>
                <div className="d-person-main">
                  <div>
                    <strong>{pessoa.nome}</strong>
                    <span data-state={pessoa.estado}>{pessoa.estado}</span>
                  </div>
                  <div className="d-person-progress">
                    <i style={{ transform: `scaleX(${pessoa.ritmo / 100})` }} aria-hidden="true" />
                  </div>
                </div>
                <span className="d-person-count">
                  <strong>{pessoa.visitas}</strong>/{pessoa.meta}
                </span>
              </article>
            ))}
          </div>
        </div>

        <aside className="d-team-responsibility">
          <div className="d-responsibility-heading">
            <LockKeyhole size={20} aria-hidden="true" />
            <div>
              <span className="d-section-index">RESPONSABILIDADE</span>
              <h2>Gestão sem invadir a conversa</h2>
            </div>
          </div>
          <p>
            O gestor acompanha o resultado confirmado pelo representante. A gravação e a transcrição
            não entram nesta visão.
          </p>
          <ul>
            <li>
              <Check size={15} aria-hidden="true" /> Relato revisado
            </li>
            <li>
              <Check size={15} aria-hidden="true" /> Decisões e próximos passos
            </li>
            <li>
              <Check size={15} aria-hidden="true" /> Ritmo e pendências
            </li>
            <li>
              <ShieldCheck size={15} aria-hidden="true" /> Áudio e transcrição privados
            </li>
          </ul>
          <button type="button">
            Revisar permissões <ArrowRight size={16} aria-hidden="true" />
          </button>
        </aside>
      </div>
    </section>
  );
}

function ConteudoOperacional({ aba }: { aba: Exclude<Aba, "novo"> }) {
  if (aba === "agenda") return <AgendaPrototipo />;
  if (aba === "historico") return <RelatosPrototipo />;
  if (aba === "crm") return <CrmPrototipo />;
  return <EquipePrototipo />;
}

function ShellPrototipo({
  estadoGravacao,
  onMudarEstado,
}: {
  estadoGravacao: EstadoGravacao;
  onMudarEstado: (estado: EstadoGravacao) => void;
}) {
  const [aba, setAba] = useState<Aba>("novo");
  const indiceEtapa =
    estadoGravacao === "idle" ||
    estadoGravacao === "permission" ||
    estadoGravacao === "recording" ||
    estadoGravacao === "paused"
      ? 0
      : estadoGravacao === "ready" || estadoGravacao === "reviewing"
        ? 2
        : 1;
  const sincronizacao =
    estadoGravacao === "offline"
      ? { texto: "Salvo neste aparelho", tom: "warning" }
      : estadoGravacao === "error"
        ? { texto: "Envio interrompido", tom: "danger" }
        : ["saving", "uploading", "transcribing", "organizing"].includes(estadoGravacao)
          ? { texto: "Sincronizando", tom: "brand" }
          : { texto: "Sincronizado agora", tom: "success" };
  const contexto =
    aba === "novo"
      ? {
          titulo: "Novo relato",
          descricao: "Fale enquanto a visita ainda está fresca. O doniq organiza o próximo passo.",
        }
      : CONTEUDO_ABA[aba];
  const metadados =
    aba === "novo"
      ? ["Casa Andrade", "Hoje, 14:30"]
      : aba === "agenda"
        ? ["Setembro 2026", "3 compromissos hoje"]
        : aba === "historico"
          ? ["18 relatos", "Último hoje, 15:10"]
          : aba === "crm"
            ? ["Pipedrive conectado", "Atualizado agora"]
            : ["6 pessoas", "Ciclo de 7 dias"];

  return (
    <main className="d-shell">
      <aside className="d-sidebar" aria-label="Navegação principal">
        <div className="d-sidebar-brand">
          <Marca largura={112} />
          <small>Falou, tá feito.</small>
          <span className="d-sidebar-trace" aria-hidden="true" />
        </div>

        <nav className="d-nav">
          {ABAS.map(({ id, nome, Icone, ...item }) => (
            <button
              key={id}
              type="button"
              className="d-nav-button"
              aria-current={aba === id ? "page" : undefined}
              onClick={() => {
                setAba(id);
                window.scrollTo({ top: 0, behavior: "auto" });
              }}
            >
              {aba === id && (
                <motion.i
                  className="d-nav-active"
                  layoutId="d-nav-active"
                  transition={TRANSICAO_UI}
                  aria-hidden="true"
                />
              )}
              <Icone size={18} aria-hidden="true" />
              <span>{nome}</span>
              {"contagem" in item && item.contagem ? (
                <span className="d-nav-count">{item.contagem}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="d-sidebar-account">
          <span className="d-avatar" aria-hidden="true">
            JM
          </span>
          <span className="d-account-copy">
            <strong>José</strong>
            <span>jose@empresa.com.br</span>
          </span>
          <button type="button" className="d-icon-button" aria-label="Configurações">
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <section className="d-main">
        <header className="d-page-header">
          <div>
            <div className="d-page-context">
              <span>
                {aba === "novo" ? (
                  <MapPin size={14} aria-hidden="true" />
                ) : aba === "crm" ? (
                  <Plug size={14} aria-hidden="true" />
                ) : aba === "equipe" ? (
                  <Users size={14} aria-hidden="true" />
                ) : (
                  <CalendarDays size={14} aria-hidden="true" />
                )}
                {metadados[0]}
              </span>
              <span>
                <Clock3 size={14} aria-hidden="true" />
                {metadados[1]}
              </span>
            </div>
            <h1>{contexto.titulo}</h1>
            <p>{contexto.descricao}</p>
          </div>
          <div className="d-sync" data-tone={sincronizacao.tom}>
            <span className="d-sync-dot" aria-hidden="true" />
            {sincronizacao.texto}
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={aba}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {aba === "novo" ? (
              <div className="d-workspace">
                <aside className="d-context" aria-labelledby="d-context-title">
                  <p className="d-section-index">01</p>
                  <h2 id="d-context-title">Percurso da visita</h2>
                  <p>A trilha mostra onde você está e o que continua sob seu controle.</p>
                  <ol className="d-steps">
                    {ETAPAS_VISITA.map((etapa, indice) => (
                      <li
                        key={etapa}
                        data-active={indice === indiceEtapa}
                        data-complete={indice < indiceEtapa}
                      >
                        <span className="d-step-number">
                          {indice < indiceEtapa ? (
                            <Check size={13} aria-hidden="true" />
                          ) : (
                            indice + 1
                          )}
                        </span>
                        <span>{etapa}</span>
                      </li>
                    ))}
                  </ol>
                </aside>

                <div
                  className="d-mobile-journey"
                  aria-label={`Etapa atual: ${ETAPAS_VISITA[indiceEtapa]}`}
                >
                  <div>
                    <span>
                      Etapa {indiceEtapa + 1} de {ETAPAS_VISITA.length}
                    </span>
                    <strong>{ETAPAS_VISITA[indiceEtapa]}</strong>
                  </div>
                  <div className="d-mobile-journey-track" aria-hidden="true">
                    <motion.i
                      initial={false}
                      animate={{ scaleX: (indiceEtapa + 1) / ETAPAS_VISITA.length }}
                      transition={TRANSICAO_UI}
                    />
                  </div>
                </div>

                <Gravador estado={estadoGravacao} onMudarEstado={onMudarEstado} />

                <aside className="d-continuity" aria-labelledby="d-continuity-title">
                  <div>
                    <p className="d-section-index">02</p>
                    <h2 id="d-continuity-title">A visita continua</h2>
                    <p>O resultado da conversa já entra no fluxo de trabalho.</p>
                  </div>
                  <div className="d-continuity-list">
                    <div className="d-continuity-item">
                      <span className="d-continuity-icon">
                        <FileText size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Ficha organizada</strong>
                        <span>Resumo, decisões, objeções e próximos passos.</span>
                      </div>
                    </div>
                    <div className="d-continuity-item">
                      <span className="d-continuity-icon">
                        <ShieldCheck size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Revisão privada</strong>
                        <span>Nada vai para o gestor antes da sua confirmação.</span>
                      </div>
                    </div>
                    <div className="d-continuity-item">
                      <span className="d-continuity-icon">
                        <Bell size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Próxima ação</strong>
                        <span>Retorno e compromisso já entram no seu fluxo.</span>
                      </div>
                    </div>
                  </div>
                  <div className="d-queue">
                    <strong>Funciona com sinal instável</strong>
                    O áudio permanece no aparelho e entra na fila quando a conexão voltar.
                  </div>
                </aside>
              </div>
            ) : (
              <ConteudoOperacional aba={aba} />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}

export default function InterfaceD() {
  const [tela, setTela] = useState<Tela>("login");
  const [direcaoVisual, setDirecaoVisual] = useState<DirecaoVisual>("hibrida");
  const [estadoGravacao, setEstadoGravacao] = useState<EstadoGravacao>("idle");

  return (
    <MotionConfig reducedMotion="user" transition={TRANSICAO_UI}>
      <div className="d-ui" data-visual-direction={direcaoVisual}>
        <ControlePrototipo
          tela={tela}
          direcaoVisual={direcaoVisual}
          estadoGravacao={estadoGravacao}
          onMudar={setTela}
          onMudarDirecao={setDirecaoVisual}
          onMudarEstado={setEstadoGravacao}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tela}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {tela === "login" ? (
              <LoginPrototipo onEntrar={() => setTela("app")} />
            ) : (
              <ShellPrototipo estadoGravacao={estadoGravacao} onMudarEstado={setEstadoGravacao} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
