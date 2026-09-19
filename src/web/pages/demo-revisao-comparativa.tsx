import {
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Cloud,
  CloudOff,
  MessageCircle,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Marca } from "../components/marca";

type Variante = "a" | "b";
type EstadoSalvo = "salvo" | "salvando" | "fila" | "sincronizando" | "sincronizado" | "falha";

const RESUMO =
  "Marcelo demonstrou interesse nos instrumentais e está comparando a proposta com a Medstar. O volume estimado é de 40 unidades por mês.";
const ACAO = "Enviar proposta com condições para 40 unidades";
const MENSAGEM =
  "Olá, Marcelo. Conforme conversamos, vou enviar a proposta para 40 unidades até sexta-feira. Se precisar ajustar algum item antes disso, me avise.";

function Etapas({ confirmado }: { confirmado: boolean }) {
  return (
    <ol className={`ux-etapas ${confirmado ? "ux-etapas--feito" : ""}`} aria-label="Etapas do relato">
      <li className="concluida">
        <span aria-hidden="true">
          <Check size={14} />
        </span>
        Falar
      </li>
      <li
        className={confirmado ? "concluida" : "atual"}
        aria-current={confirmado ? undefined : "step"}
      >
        <span aria-hidden="true">{confirmado ? <Check size={14} /> : "2"}</span>
        Revisar
      </li>
      <li className={confirmado ? "atual" : ""} aria-current={confirmado ? "step" : undefined}>
        <span aria-hidden="true">3</span>
        Feito
      </li>
    </ol>
  );
}

const STATUS_SALVAMENTO: Record<
  EstadoSalvo,
  { texto: string; icone: React.ReactNode; classe: string }
> = {
  salvo: {
    texto: "Salvo no aparelho",
    icone: <Save size={14} aria-hidden="true" />,
    classe: "",
  },
  salvando: {
    texto: "Salvando no aparelho",
    icone: <Clock3 size={14} aria-hidden="true" />,
    classe: "",
  },
  fila: {
    texto: "Offline · na fila",
    icone: <CloudOff size={14} aria-hidden="true" />,
    classe: "ux-salvamento--aviso",
  },
  sincronizando: {
    texto: "Sincronizando",
    icone: <RefreshCw size={14} aria-hidden="true" />,
    classe: "ux-salvamento--ativo",
  },
  sincronizado: {
    texto: "Sincronizado",
    icone: <Cloud size={14} aria-hidden="true" />,
    classe: "ux-salvamento--ok",
  },
  falha: {
    texto: "Falha ao sincronizar",
    icone: <TriangleAlert size={14} aria-hidden="true" />,
    classe: "ux-salvamento--erro",
  },
};

function CabecalhoRelato({
  confirmado,
  estadoSalvo,
  onTentarNovamente,
}: {
  confirmado: boolean;
  estadoSalvo: EstadoSalvo;
  onTentarNovamente: () => void;
}) {
  const status = STATUS_SALVAMENTO[estadoSalvo];

  return (
    <header className="ux-cabecalho-relato">
      <div>
        <span className="ux-kicker">
          <AudioLines size={15} aria-hidden="true" />
          Relatório da visita
        </span>
        <h1>Cirúrgica Paraná</h1>
        <p>Marcelo · Responsável pelo CME</p>
      </div>
      <div className="ux-status-grupo">
        <span className="ux-temperatura">
          <span aria-hidden="true" />
          Interesse quente
        </span>
        <output className={`ux-salvamento ${status.classe}`} aria-live="polite">
          {status.icone}
          {confirmado && estadoSalvo === "salvo" ? "Confirmado no aparelho" : status.texto}
        </output>
        {estadoSalvo === "falha" && (
          <button type="button" className="ux-sincronizar-novamente" onClick={onTentarNovamente}>
            Tentar novamente
          </button>
        )}
      </div>
    </header>
  );
}

function CampoIncerto({
  decisor,
  naoMencionado,
  erro,
  onDecisor,
  onNaoMencionado,
  inputRef,
}: {
  decisor: string;
  naoMencionado: boolean;
  erro: boolean;
  onDecisor: (valor: string) => void;
  onNaoMencionado: (valor: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <section className={`ux-incerteza ${erro ? "ux-incerteza--erro" : ""}`} aria-labelledby="ux-incerteza-titulo">
      <div className="ux-secao-topo">
        <span className="ux-icone-aviso" aria-hidden="true">
          <CircleAlert size={18} />
        </span>
        <div>
          <p className="ux-label">Precisa da sua palavra</p>
          <h2 id="ux-incerteza-titulo">Quem participa da aprovação final?</h2>
        </div>
        <span className="ux-confianca">não identificado</span>
      </div>
      <p className="ux-ajuda">Essa informação não apareceu com clareza no relato.</p>
      <label className="ux-label-campo" htmlFor="ux-decisor">
        Responsável pela aprovação
      </label>
      <input
        ref={inputRef}
        type="text"
        id="ux-decisor"
        name="decisor"
        aria-label="Responsável pela aprovação"
        value={decisor}
        disabled={naoMencionado}
        aria-invalid={erro}
        aria-describedby={erro ? "ux-decisor-erro ux-decisor-base" : "ux-decisor-base"}
        placeholder="Digite o nome ou cargo"
        onChange={(evento) => onDecisor(evento.target.value)}
      />
      {erro && (
        <p id="ux-decisor-erro" className="ux-erro">
          Preencha o responsável ou marque que ele não foi mencionado.
        </p>
      )}
      <label className="ux-checkbox">
        <input
          type="checkbox"
          aria-label="Não foi mencionado na visita"
          checked={naoMencionado}
          onChange={(evento) => onNaoMencionado(evento.target.checked)}
        />
        <span aria-hidden="true">
          <Check size={14} />
        </span>
        Não foi mencionado na visita
      </label>
      <p id="ux-decisor-base" className="ux-evidencia">
        <AudioLines size={14} aria-hidden="true" />
        Nenhum trecho do relato sustenta uma resposta.
      </p>
    </section>
  );
}

function ProximoPasso() {
  return (
    <section className="ux-proximo" aria-labelledby="ux-proximo-titulo">
      <div className="ux-fluxo" aria-hidden="true">
        <AudioLines size={16} />
        <span />
        <Sparkles size={16} />
        <span />
        <ArrowRight size={16} />
      </div>
      <div className="ux-secao-topo">
        <div>
          <p className="ux-label">Ação combinada</p>
          <h2 id="ux-proximo-titulo">{ACAO}</h2>
        </div>
      </div>
      <div className="ux-prazo">
        <CalendarDays size={18} aria-hidden="true" />
        <span>
          <small>Quando</small>
          Sexta-feira, 4 de setembro, às 10h
        </span>
      </div>
      <p className="ux-evidencia">
        <AudioLines size={14} aria-hidden="true" />
        “Pediu proposta até sexta.”
      </p>
    </section>
  );
}

function MensagemCliente({
  mensagem,
  onMensagem,
}: {
  mensagem: string;
  onMensagem: (valor: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <section className="ux-mensagem" aria-labelledby="ux-mensagem-titulo">
      <div className="ux-secao-topo">
        <div>
          <p className="ux-label">Pronta para ajustar</p>
          <h2 id="ux-mensagem-titulo">
            <MessageCircle size={18} aria-hidden="true" />
            Mensagem para o cliente
          </h2>
        </div>
        <button type="button" className="ux-link-botao" onClick={() => setEditando((valor) => !valor)}>
          {editando ? "Concluir edição" : "Editar"}
        </button>
      </div>
      {editando ? (
        <textarea
          aria-label="Mensagem para o cliente"
          value={mensagem}
          onChange={(evento) => onMensagem(evento.target.value)}
        />
      ) : (
        <p className="ux-mensagem-texto">{mensagem}</p>
      )}
    </section>
  );
}

function Evidencias() {
  return (
    <details className="ux-detalhes">
      <summary>
        <span>
          <AudioLines size={17} aria-hidden="true" />
          Evidências e detalhes
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="ux-detalhes-conteudo">
        <div>
          <span>Objeção</span>
          <p>Considerou o preço acima da alternativa atual.</p>
          <small>“Achou o preço salgado e está comparando com a Medstar.”</small>
        </div>
        <div>
          <span>Em aberto</span>
          <p>Quem participa da aprovação final?</p>
        </div>
        <div>
          <span>Transcrição</span>
          <p>
            Passei na Cirúrgica Paraná e falei com o Marcelo. Ele quer receber a proposta até
            sexta.
          </p>
        </div>
      </div>
    </details>
  );
}

function Resultado() {
  return (
    <section className="ux-resultado" aria-labelledby="ux-resultado-titulo">
      <div className="ux-resultado-marca" aria-hidden="true">
        <Target size={19} />
      </div>
      <div>
        <p className="ux-label">Resultado da visita</p>
        <h2 id="ux-resultado-titulo">Há interesse e uma proposta foi solicitada.</h2>
        <p>{RESUMO}</p>
      </div>
    </section>
  );
}

function ItensConferidos() {
  return (
    <details className="ux-detalhes ux-conferidos">
      <summary>
        <span>
          <CheckCircle2 size={17} aria-hidden="true" />
          Itens já conferidos
        </span>
        <span className="ux-detalhes-meta">
          Resultado e próximo passo
          <ChevronDown size={18} aria-hidden="true" />
        </span>
      </summary>
      <div className="ux-conferidos-conteudo">
        <section aria-labelledby="ux-b2-resultado">
          <span className="ux-conferido-icone" aria-hidden="true">
            <Target size={17} />
          </span>
          <div>
            <p className="ux-label">Resultado da visita</p>
            <h2 id="ux-b2-resultado">Há interesse e uma proposta foi solicitada.</h2>
            <p>{RESUMO}</p>
          </div>
        </section>
        <section aria-labelledby="ux-b2-proximo">
          <span className="ux-conferido-icone" aria-hidden="true">
            <CalendarDays size={17} />
          </span>
          <div>
            <p className="ux-label">Próximo passo</p>
            <h2 id="ux-b2-proximo">{ACAO}</h2>
            <p>Sexta-feira, 4 de setembro, às 10h</p>
          </div>
        </section>
      </div>
    </details>
  );
}

function MensagemRecolhida({
  mensagem,
  onMensagem,
}: {
  mensagem: string;
  onMensagem: (valor: string) => void;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <details className="ux-detalhes ux-mensagem-recolhida">
      <summary>
        <span>
          <MessageCircle size={17} aria-hidden="true" />
          Mensagem para o cliente
        </span>
        <span className="ux-detalhes-meta">
          Opcional
          <ChevronDown size={18} aria-hidden="true" />
        </span>
      </summary>
      <div className="ux-mensagem-recolhida-conteudo">
        <div className="ux-mensagem-recolhida-topo">
          <p>Pronta para revisar antes do envio.</p>
          <button type="button" className="ux-link-botao" onClick={() => setEditando((valor) => !valor)}>
            {editando ? "Concluir edição" : "Editar"}
          </button>
        </div>
        {editando ? (
          <textarea
            aria-label="Mensagem para o cliente"
            value={mensagem}
            onChange={(evento) => onMensagem(evento.target.value)}
          />
        ) : (
          <p className="ux-mensagem-texto">{mensagem}</p>
        )}
      </div>
    </details>
  );
}

function VarianteResultado(props: {
  decisor: string;
  naoMencionado: boolean;
  erro: boolean;
  mensagem: string;
  onDecisor: (valor: string) => void;
  onNaoMencionado: (valor: boolean) => void;
  onMensagem: (valor: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="ux-conteudo ux-conteudo--resultado">
      <Resultado />
      <ProximoPasso />
      <CampoIncerto {...props} />
      <MensagemCliente mensagem={props.mensagem} onMensagem={props.onMensagem} />
      <Evidencias />
    </div>
  );
}

function VarianteConfianca(props: {
  decisor: string;
  naoMencionado: boolean;
  erro: boolean;
  mensagem: string;
  onDecisor: (valor: string) => void;
  onNaoMencionado: (valor: boolean) => void;
  onMensagem: (valor: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="ux-conteudo ux-conteudo--confianca">
      <section className="ux-painel-confianca" aria-labelledby="ux-confianca-titulo">
        <p className="ux-label">Revisão inteligente</p>
        <h2 id="ux-confianca-titulo">1 ajuste pendente</h2>
        <p>Confira só o ponto que não ficou claro no relato.</p>
      </section>
      <CampoIncerto {...props} />
      <ItensConferidos />
      <MensagemRecolhida mensagem={props.mensagem} onMensagem={props.onMensagem} />
      <Evidencias />
    </div>
  );
}

export default function DemoRevisaoComparativa() {
  const variante: Variante = window.location.pathname.endsWith("-b") ? "b" : "a";
  const [decisor, setDecisor] = useState("");
  const [naoMencionado, setNaoMencionado] = useState(false);
  const [erro, setErro] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [mensagem, setMensagem] = useState(MENSAGEM);
  const [estadoSalvo, setEstadoSalvo] = useState<EstadoSalvo>(
    navigator.onLine ? "salvo" : "fila",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const tituloFeitoRef = useRef<HTMLHeadingElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const pronto = decisor.trim().length > 0 || naoMencionado;

  const marcarMudanca = () => {
    setEstadoSalvo("salvando");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => setEstadoSalvo(navigator.onLine ? "salvo" : "fila"),
      700,
    );
  };

  useEffect(() => {
    const marcarOffline = () => setEstadoSalvo("fila");
    const marcarOnline = () => {
      setEstadoSalvo("sincronizando");
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setEstadoSalvo("sincronizado"), 900);
    };

    window.addEventListener("offline", marcarOffline);
    window.addEventListener("online", marcarOnline);

    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener("offline", marcarOffline);
      window.removeEventListener("online", marcarOnline);
    };
  }, []);

  useEffect(() => {
    if (confirmado) tituloFeitoRef.current?.focus();
  }, [confirmado]);

  const atualizarDecisor = (valor: string) => {
    setDecisor(valor);
    setErro(false);
    marcarMudanca();
  };

  const atualizarNaoMencionado = (valor: boolean) => {
    setNaoMencionado(valor);
    setErro(false);
    if (valor) setDecisor("");
    marcarMudanca();
  };

  const tentarSincronizar = () => {
    if (!navigator.onLine) {
      setEstadoSalvo("fila");
      return;
    }
    setEstadoSalvo("sincronizando");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setEstadoSalvo("sincronizado"), 900);
  };

  const confirmar = () => {
    const comportamento = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    if (!decisor.trim() && !naoMencionado) {
      setErro(true);
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: comportamento, block: "center" });
      return;
    }
    setConfirmado(true);
    if (!navigator.onLine) {
      setEstadoSalvo("fila");
    } else {
      setEstadoSalvo("sincronizando");
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const simularFalha = new URLSearchParams(window.location.search).get("sync") === "falha";
        setEstadoSalvo(simularFalha ? "falha" : "sincronizado");
      }, 900);
    }
    window.scrollTo({ top: 0, behavior: comportamento });
  };

  return (
    <main className={`ux-estudo ux-estudo--${variante}`}>
      <a className="ux-pular" href="#conteudo-revisao">
        Pular para a revisão
      </a>
      <header className="ux-topo">
        <div>
          <Marca largura={104} />
          <span>Falou, tá feito.</span>
        </div>
        <span className="ux-demo-status">
          <span aria-hidden="true" />
          Protótipo de teste
        </span>
      </header>
      <Etapas confirmado={confirmado} />

      <article id="conteudo-revisao" className="ux-painel">
        <CabecalhoRelato
          confirmado={confirmado}
          estadoSalvo={estadoSalvo}
          onTentarNovamente={tentarSincronizar}
        />
        {confirmado ? (
          <section className="ux-feito" aria-live="polite">
            <span aria-hidden="true">
              <CheckCircle2 size={28} />
            </span>
            <div>
              <p className="ux-label">Feito</p>
              <h2 ref={tituloFeitoRef} tabIndex={-1}>
                Relatório confirmado.
              </h2>
              <p>
                Próximo passo registrado. A mensagem está pronta e o relatório permanece salvo no
                aparelho até a sincronização.
              </p>
            </div>
          </section>
        ) : variante === "a" ? (
          <VarianteResultado
            decisor={decisor}
            naoMencionado={naoMencionado}
            erro={erro}
            mensagem={mensagem}
            onDecisor={atualizarDecisor}
            onNaoMencionado={atualizarNaoMencionado}
            onMensagem={(valor) => {
              setMensagem(valor);
              marcarMudanca();
            }}
            inputRef={inputRef}
          />
        ) : (
          <VarianteConfianca
            decisor={decisor}
            naoMencionado={naoMencionado}
            erro={erro}
            mensagem={mensagem}
            onDecisor={atualizarDecisor}
            onNaoMencionado={atualizarNaoMencionado}
            onMensagem={(valor) => {
              setMensagem(valor);
              marcarMudanca();
            }}
            inputRef={inputRef}
          />
        )}
      </article>

      {!confirmado && (
        <footer className="ux-acao-fixa">
          <div>
            <span>{pronto ? "Pronto para concluir" : "1 ponto precisa de você"}</span>
            <small>Você confirma antes de compartilhar ou enviar.</small>
          </div>
          <button type="button" onClick={confirmar}>
            Confirmar relatório
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </footer>
      )}
    </main>
  );
}
