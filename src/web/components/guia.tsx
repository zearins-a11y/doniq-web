/**
 * Dôni — o guia opcional do doniq.
 *
 * Desenho: o mesmo orbe do botão de voz, reduzido, com duas pupilas finas. Não
 * é um bichinho: é o orbe da marca prestando atenção. Isso mantém o gradiente
 * violeta → azul → ciano como único sinal de cor e evita o registro lúdico que
 * não combina com quem vende OPME dentro de um hospital.
 *
 * Comportamento:
 * - fica no canto, acima da barra de navegação, e nunca cobre um campo;
 * - fechado mostra só o orbe com a frase da etapa; aberto mostra uma dica por vez;
 * - "desligar" some com ele de vez (preferência no localStorage) e o chip do
 *   topo é o único caminho de volta;
 * - arrastar o guia para o lado também desliga: é o gesto que a pessoa já usa
 *   para dispensar notificação, e sai da mão sem procurar botão;
 * - `prefers-reduced-motion` desliga a piscada e a entrada.
 *
 * O texto vive em `shared/guia.ts` para o app reusar palavra por palavra.
 */

import {
  createContext,
  type PointerEvent as EventoPonteiro,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ARRASTO_MINIMO,
  GUIA_CHAVE,
  GUIA_NOME,
  GUIA_PADRAO_LIGADO,
  type PassoGuia,
  RESUMO_PASSO,
  arrastoEhRolagem,
  dicasDoPasso,
  dispensaPorArrasto,
  opacidadeArrasto,
} from "../../shared/guia";
import { GRADIENTE } from "../../shared/tokens";

/**
 * Em que etapa a pessoa está. Quem sabe disso é a tela (captura ou relatório),
 * e quem precisa saber é o guia, que vive no canto — daí o contexto, em vez de
 * empurrar prop por cinco níveis.
 *
 * `visivel` existe porque o guia só tem dica para o fluxo de gravação (falar/
 * revisar/feito) — em Agenda, Histórico, CRM e Equipe não há passo nenhum
 * marcado, e o guia (que vive montado o app inteiro em app.tsx, não por tela)
 * ficava mostrando a última dica do fluxo de gravação por cima do conteúdo
 * dessas telas. `useEsconderGuia` é o que essas telas chamam para dizer "aqui
 * não faz sentido".
 */
type EstadoPasso = { passo: PassoGuia; dicaDoTipo?: string; visivel: boolean };
const CtxPasso = createContext<{
  estado: EstadoPasso;
  definir: (e: { passo: PassoGuia; dicaDoTipo?: string }) => void;
  ocultar: (esconder: boolean) => void;
}>({ estado: { passo: "falar", visivel: true }, definir: () => {}, ocultar: () => {} });

export function ProvedorPasso({ children }: { children: React.ReactNode }) {
  const [passo, definirPasso] = useState<{ passo: PassoGuia; dicaDoTipo?: string }>({
    passo: "falar",
  });
  const [ocultacoes, setOcultacoes] = useState(0);
  const valor = useMemo(
    () => ({
      estado: { ...passo, visivel: ocultacoes === 0 },
      definir: definirPasso,
      ocultar: (esconder: boolean) => setOcultacoes((n) => Math.max(0, n + (esconder ? 1 : -1))),
    }),
    [passo, ocultacoes],
  );
  return <CtxPasso.Provider value={valor}>{children}</CtxPasso.Provider>;
}

/** A tela declara onde a pessoa está. Chamar isto é o único jeito de mexer no guia. */
export function useMarcarPasso(passo: PassoGuia, dicaDoTipo?: string) {
  const { definir } = useContext(CtxPasso);
  useEffect(() => {
    definir({ passo, dicaDoTipo });
  }, [passo, dicaDoTipo, definir]);
}

/**
 * Telas fora do fluxo de gravação chamam isto para tirar o guia do caminho —
 * ele não tem dica para elas, e sem isso ficava flutuando por cima do
 * conteúdo mostrando a última dica de uma tela diferente. Some enquanto a
 * tela estiver montada; volta sozinho ao sair.
 */
export function useEsconderGuia() {
  const { ocultar } = useContext(CtxPasso);
  useEffect(() => {
    ocultar(true);
    return () => ocultar(false);
  }, [ocultar]);
}

/** Preferência de guia ligado/desligado, persistida no aparelho. */
export function useGuia() {
  const [ligado, setLigado] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem(GUIA_CHAVE);
      return salvo === null ? GUIA_PADRAO_LIGADO : salvo === "on";
    } catch {
      return GUIA_PADRAO_LIGADO;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(GUIA_CHAVE, ligado ? "on" : "off");
    } catch {
      /* modo privado: vale só nesta sessão */
    }
  }, [ligado]);
  return { ligado, alternar: () => setLigado((v) => !v) };
}

/** Chip do topo. É o interruptor — e o único jeito de trazer o guia de volta. */
export function ChipGuia({ ligado, onAlternar }: { ligado: boolean; onAlternar: () => void }) {
  return (
    <button
      className={"chip chip-guia" + (ligado ? " on" : "")}
      aria-pressed={ligado}
      onClick={onAlternar}
      title={ligado ? `desligar o ${GUIA_NOME}` : `ligar o ${GUIA_NOME}`}
    >
      <Orbe tamanho={14} />
      guia
    </button>
  );
}

/** O orbe. `atento` levanta as pupilas; sem ele o olhar fica baixo, em repouso. */
function Orbe({ tamanho = 40, atento = false }: { tamanho?: number; atento?: boolean }) {
  // Id único por instância: o chip do topo e o orbe flutuante coexistem na
  // mesma página, e dois `linearGradient` com o mesmo id quebrariam o segundo.
  const grad = `orbe-doni-${useId()}`;
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 40 40"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        {/* O gradiente sai da fonte única de tokens — nunca de um hex solto. */}
        <linearGradient id={grad} x1="4" y1="36" x2="34" y2="6" gradientUnits="userSpaceOnUse">
          {GRADIENTE.marca.map((cor, n) => (
            <stop key={cor} offset={GRADIENTE.paradas[n]} stopColor={cor} />
          ))}
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${grad})`} />
      <g className="orbe-olhos" fill="#fff" opacity="0.96">
        <rect x="12.6" y={atento ? 14.2 : 16.4} width="3.2" height="7.4" rx="1.6" />
        <rect x="24.2" y={atento ? 14.2 : 16.4} width="3.2" height="7.4" rx="1.6" />
      </g>
    </svg>
  );
}

/**
 * Arrastar para o lado dispensa o guia.
 *
 * Só conta o gesto horizontal: quem está rolando a tela move o dedo na vertical
 * e o guia devolve o controle na hora, sem sequestrar a rolagem. Enquanto o
 * dedo está na tela o guia acompanha e vai perdendo opacidade, então dá para
 * desistir no meio do caminho — dispensar sem aviso é o tipo de gesto que
 * assusta quem está no corredor do hospital com o cliente ao lado.
 */
function useArrastar(onDesligar: () => void) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const arrastou = useRef(false);
  // A decisão de dispensar lê o ref, não o estado: dois eventos no mesmo tique
  // (teste automatizado, gesto muito rápido) seriam agrupados pelo React e a
  // distância chegaria zerada no `pointerup`.
  const dxRef = useRef(0);

  function aoDescer(e: EventoPonteiro<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    inicio.current = { x: e.clientX, y: e.clientY };
    arrastou.current = false;
    dxRef.current = 0;
  }

  function aoMover(e: EventoPonteiro<HTMLDivElement>) {
    const p = inicio.current;
    if (!p) return;
    const dxAtual = e.clientX - p.x;
    const dyAtual = e.clientY - p.y;
    if (!arrastando) {
      if (Math.abs(dxAtual) < ARRASTO_MINIMO) return;
      if (arrastoEhRolagem(dxAtual, dyAtual)) {
        inicio.current = null;
        return;
      }
      setArrastando(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro já liberado: o gesto continua valendo pelos eventos do elemento */
      }
    }
    arrastou.current = true;
    dxRef.current = dxAtual;
    setDx(dxAtual);
  }

  function aoSoltar() {
    if (!inicio.current) return;
    inicio.current = null;
    setArrastando(false);
    const percorrido = dxRef.current;
    dxRef.current = 0;
    if (dispensaPorArrasto(percorrido)) {
      onDesligar();
      return;
    }
    setDx(0);
  }

  const opacidade = arrastando ? opacidadeArrasto(dx) : undefined;

  return {
    /** `foiArrasto` diz ao botão do orbe para não abrir a bolha ao fim do gesto. */
    foiArrasto: () => arrastou.current,
    props: {
      onPointerDown: aoDescer,
      onPointerMove: aoMover,
      onPointerUp: aoSoltar,
      onPointerCancel: aoSoltar,
      className: arrastando ? " arrastando" : "",
      style: { transform: dx ? `translateX(${dx}px)` : undefined, opacity: opacidade },
    },
  };
}

/** O guia no canto, já sabendo a etapa pelo contexto. */
export function AreaGuia({ ligado, onDesligar }: { ligado: boolean; onDesligar: () => void }) {
  const { estado } = useContext(CtxPasso);
  if (!ligado || !estado.visivel) return null;
  return <Guia passo={estado.passo} dicaDoTipo={estado.dicaDoTipo} onDesligar={onDesligar} />;
}

function Guia({
  passo,
  dicaDoTipo,
  onDesligar,
}: {
  passo: PassoGuia;
  dicaDoTipo?: string;
  onDesligar: () => void;
}) {
  const dicas = dicasDoPasso(passo, dicaDoTipo);
  const [aberto, setAberto] = useState(false);
  const [i, setI] = useState(0);
  const arrasto = useArrastar(onDesligar);
  const idBolha = useId();

  // Trocar de etapa é notícia nova: volta pra primeira dica da etapa.
  useEffect(() => {
    setI(0);
  }, [passo]);

  const dica = dicas[Math.min(i, dicas.length - 1)];
  if (!dica) return null;

  return (
    <div
      className={"guia" + (aberto ? " aberto" : "") + arrasto.props.className}
      data-passo={passo}
      style={arrasto.props.style}
      onPointerDown={arrasto.props.onPointerDown}
      onPointerMove={arrasto.props.onPointerMove}
      onPointerUp={arrasto.props.onPointerUp}
      onPointerCancel={arrasto.props.onPointerCancel}
    >
      {aberto && (
        <output id={idBolha} className="guia-bolha">
          <div className="guia-fonte">
            {dica.fonte}
            <span className="guia-conta">
              {i + 1}/{dicas.length}
            </span>
          </div>
          <p className="guia-txt">{dica.texto}</p>
          <div className="guia-acoes">
            <button className="chip" onClick={() => setI((n) => (n + 1) % dicas.length)}>
              próxima dica
            </button>
            <button className="chip guia-off" onClick={onDesligar}>
              desligar
            </button>
          </div>
        </output>
      )}
      <button
        className="guia-orbe"
        onClick={() => {
          if (arrasto.foiArrasto()) return; // o gesto era dispensa, não toque
          setAberto((v) => !v);
        }}
        aria-expanded={aberto}
        aria-controls={idBolha}
        aria-label={aberto ? `fechar o ${GUIA_NOME}` : `abrir dicas do ${GUIA_NOME}`}
      >
        <Orbe atento={aberto} />
        {!aberto && <span className="guia-resumo">{RESUMO_PASSO[passo]}</span>}
      </button>
      <span className="guia-arrasta">arraste para o lado para desligar</span>
    </div>
  );
}
