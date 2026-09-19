import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  VolumeX,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Typewriter } from "../components/motion-plus";
import { useAnalytics } from "../hooks/use-analytics";
import { usePageTitle } from "../hooks/use-page-title";
import "./landing-motion-sp-v6-1.css";

gsap.registerPlugin(useGSAP);

type EstadoFormulario = "idle" | "enviando" | "ok" | "erro";
type EtapaDemo = "falar" | "revisar" | "feito";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const VIEWPORT_ONCE = { once: true, margin: "-80px" };
const APP_WAVEFORM = [10, 16, 22, 12, 20, 26, 14, 22, 18, 24, 14, 20] as const;
const DEMO_DURATION_SECONDS = 6.2;
const TRANSCRICAO_DEMO = "Marcelo confirmou o interesse e pediu retorno na quinta-feira.";

const ETAPAS: Array<{
  id: EtapaDemo;
  numero: string;
  titulo: string;
  descricao: string;
  destaque: string;
}> = [
  {
    id: "falar",
    numero: "01",
    titulo: "Falar",
    descricao: "Registre a visita por voz enquanto os detalhes ainda estão frescos.",
    destaque: "O relato entra do seu jeito.",
  },
  {
    id: "revisar",
    numero: "02",
    titulo: "Revisar",
    descricao: "O Doniq organiza o contexto e destaca somente o que precisa de confirmação.",
    destaque: "Sua atenção vai para o ponto certo.",
  },
  {
    id: "feito",
    numero: "03",
    titulo: "Feito",
    descricao: "Confirme o relatório e deixe tudo pronto para seguir ao CRM conectado.",
    destaque: "Revisou. Está pronto para o CRM.",
  },
];

function TelaProduto({
  etapa,
  alt,
  recordingPlaying = false,
  reducedMotion = false,
}: {
  etapa: EtapaDemo;
  alt: string;
  loading?: "eager" | "lazy";
  recordingPlaying?: boolean;
  recordingCycle?: number;
  reducedMotion?: boolean;
}) {
  return (
    <div className={`v6-device v6-device-${etapa}`} aria-label={alt}>
      <span className="v6-device-island" aria-hidden="true" />
      <div className="v6-device-screen">
        {/* Status Bar Nativa */}
        <div className="v6-native-statusbar" aria-hidden="true">
          <span className="v6-native-time">9:41</span>
          <div className="v6-native-icons">
            <span className="v6-native-signal">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="v6-native-battery">
              <span className="v6-battery-level" />
            </span>
          </div>
        </div>

        {/* TELA 1: FALAR */}
        {etapa === "falar" && (
          <div className="v6-native-app-screen v6-app-falar">
            <div className="v6-app-top-meta">
              <span className="v6-app-badge-recording">
                <span className="v6-badge-pulse-dot" />
                Gravando visita
              </span>
              <span className="v6-app-code">PD-0492</span>
            </div>

            <div className="v6-app-client-box">
              <div className="v6-app-avatar">PS</div>
              <div className="v6-app-client-texts">
                <strong>Padaria São Bento</strong>
                <span>Vila Mariana · São Paulo</span>
              </div>
            </div>

            <div className="v6-app-timer-display">
              <span className="v6-app-timer-num">00:32</span>
              <span className="v6-app-timer-milis">.40</span>
            </div>

            <div className="v6-app-wave-container">
              {APP_WAVEFORM.map((height, i) => (
                <m.span
                  key={i}
                  className="v6-app-wave-bar"
                  animate={
                    recordingPlaying && !reducedMotion
                      ? { scaleY: [0.4, 1.25, 0.48] }
                      : { scaleY: 0.65 }
                  }
                  transition={{
                    duration: 0.55 + (i % 4) * 0.08,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ height: `${height * 1.1}px` }}
                />
              ))}
            </div>

            <div className="v6-app-mic-center">
              <div className="v6-app-mic-pulse" />
              <div className="v6-app-mic-button">
                <Mic2 size={24} />
              </div>
            </div>

            <div className="v6-app-footer-hint">
              <span>Ao entrar no carro, fale como foi a visita...</span>
            </div>
          </div>
        )}

        {/* TELA 2: REVISAR */}
        {etapa === "revisar" && (
          <div className="v6-native-app-screen v6-app-revisar">
            <div className="v6-app-top-meta">
              <span className="v6-app-badge-ai">
                <Sparkles size={11} />
                IA Estruturada · 98%
              </span>
              <span className="v6-app-code">Pipedrive</span>
            </div>

            <div className="v6-app-section-header">
              <h4>Revisão por Exceção</h4>
              <p>Confirme os dados extraídos do áudio:</p>
            </div>

            <div className="v6-app-fields-cards">
              <div className="v6-app-card-field v6-field-selected">
                <span className="v6-field-icon">🏢</span>
                <div className="v6-field-body">
                  <span className="v6-field-lbl">Empresa</span>
                  <strong>Padaria São Bento</strong>
                </div>
                <span className="v6-field-check">✓</span>
              </div>

              <div className="v6-app-card-field">
                <span className="v6-field-icon">👤</span>
                <div className="v6-field-body">
                  <span className="v6-field-lbl">Contato Decisor</span>
                  <strong>Seu Antônio (Sócio)</strong>
                </div>
                <span className="v6-field-check">✓</span>
              </div>

              <div className="v6-app-card-field">
                <span className="v6-field-icon">📌</span>
                <div className="v6-field-body">
                  <span className="v6-field-lbl">Próximo Passo</span>
                  <strong>Enviar proposta de 50 caixas</strong>
                </div>
                <span className="v6-field-check">✓</span>
              </div>

              <div className="v6-app-card-field">
                <span className="v6-field-icon">📅</span>
                <div className="v6-field-body">
                  <span className="v6-field-lbl">Data Acordada</span>
                  <strong>Quarta-feira, 10.set</strong>
                </div>
                <span className="v6-field-check">✓</span>
              </div>
            </div>

            <div className="v6-app-confirm-button">
              <span>Sincronizar no CRM</span>
              <ArrowRight size={14} />
            </div>
          </div>
        )}

        {/* TELA 3: FEITO */}
        {etapa === "feito" && (
          <div className="v6-native-app-screen v6-app-feito">
            <div className="v6-app-top-meta">
              <span className="v6-app-badge-success">
                <CheckCircle2 size={11} />
                Sincronizado
              </span>
              <span className="v6-app-code">CRM Conectado</span>
            </div>

            <div className="v6-app-done-celebration">
              <div className="v6-app-done-icon">
                <CheckCircle2 size={30} />
              </div>
              <h3>Falou, tá feito.</h3>
              <p>Visita registrada com sucesso no pipeline.</p>
            </div>

            <div className="v6-app-metrics-box">
              <div className="v6-app-metric-line">
                <span>⏱️ Duração do áudio:</span>
                <strong>32 segundos</strong>
              </div>
              <div className="v6-app-metric-line">
                <span>⚡ Tempo economizado:</span>
                <strong className="v6-highlight-green">~15 minutos</strong>
              </div>
              <div className="v6-app-metric-line">
                <span>🔗 Integração CRM:</span>
                <strong className="v6-highlight-cyan">Pipedrive #PD-0492</strong>
              </div>
            </div>

            <div className="v6-app-restart-button">
              <span>Novo relato de visita</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [pausado, setPausado] = useState(false);
  const [encerrado, setEncerrado] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    // Restaura o estado de "encerrado" se o usuário der play manual ou voltar no vídeo.
    video.addEventListener("play", () => setEncerrado(false));
    video.addEventListener("seeked", () => {
      if (video.currentTime < video.duration - 0.5) setEncerrado(false);
    });
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setPausado(false))
        .catch((err) => {
          console.warn("Autoplay bloqueado pelo navegador:", err);
          setPausado(true);
        });
    }

    function tentarDesbloquear() {
      const v = videoRef.current;
      if (v && v.paused) {
        v.muted = true;
        void v.play().then(() => setPausado(false)).catch(() => {});
      }
    }
    window.addEventListener("click", tentarDesbloquear, { once: true });
    window.addEventListener("touchstart", tentarDesbloquear, { once: true });
    window.addEventListener("scroll", tentarDesbloquear, { once: true });
    return () => {
      window.removeEventListener("click", tentarDesbloquear);
      window.removeEventListener("touchstart", tentarDesbloquear);
      window.removeEventListener("scroll", tentarDesbloquear);
    };
  }, []);

  function alternarVideo() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.ended) {
        video.currentTime = 0;
      }
      void video
        .play()
        .then(() => setPausado(false))
        .catch(() => setPausado(true));
      return;
    }

    video.pause();
    setPausado(true);
  }

  return (
    <section className="v6-hero" id="inicio" ref={heroRef}>
      <div className="v6-hero-media" aria-hidden="true">
        <img
          className="v6-hero-poster"
          src="/doniq-representante-sp-hero-matchcut-poster.jpg"
          alt=""
        />
        <video
          ref={videoRef}
          src="/doniq-representante-sp-hero-matchcut-source.mp4"
          poster="/doniq-representante-sp-hero-matchcut-poster.jpg"
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-label="Demonstração do representante comercial usando o Doniq"
          className={encerrado ? "v6-hero-video v6-hero-video-ended" : "v6-hero-video"}
          onPlay={() => setPausado(false)}
          onPause={() => setPausado(true)}
          onEnded={() => setEncerrado(true)}
        />
      </div>
      <div className="v6-hero-shade" aria-hidden="true" />

      <header className="v6-nav">
        <a href="#inicio" className="v6-brand" aria-label="Doniq, início">
          <img src="/doniq-wordmark-white.svg" alt="" width="124" height="37" />
        </a>
        <nav aria-label="Navegação principal">
          <a href="#produto">Produto</a>
          <a href="/demo/mobile">Simulador</a>
          <a href="/gestao">Gestão</a>
          <a href="/precos">Preços</a>
          <a href="#piloto" className="v6-nav-cta">
            Quero participar do piloto
          </a>
        </nav>
      </header>

      <div className="v6-hero-content">
        <m.div
          className="v6-hero-copy"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.56, ease: EASE_OUT }}
        >
          <p className="v6-eyebrow">🎙️ Pós-visita comercial</p>
          <h1>
            Você relata em 30 segundos ao entrar no carro.
            <br />
            <span className="v61-gradient-text">Seu CRM recebe tudo pronto.</span>
          </h1>
          <p className="v6-hero-subtitle">
            Grave seu áudio logo após a reunião. O Doniq extrai dores, valores e próximos passos sem digitação no notebook à noite.
          </p>
          <div className="v6-actions">
            <a className="v6-button v6-button-primary v61-hero-cta" href="#piloto">
              Testar 7 dias grátis
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="v6-button v6-button-secondary" href="#produto">
              Ver demonstração interativa ↓
            </a>
          </div>
        </m.div>

        <m.div
          className="v6-hero-product"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: EASE_OUT }}
        >
          <TelaProduto
            etapa="feito"
            alt="Interface do Doniq confirmando o relatório pronto para envio ao CRM"
          />
        </m.div>
      </div>

      <button
        type="button"
        className="v6-video-control"
        onClick={alternarVideo}
        aria-label={pausado ? "Reproduzir vídeo de fundo" : "Pausar vídeo de fundo"}
        aria-pressed={pausado}
      >
        {pausado ? (
          <Play size={18} fill="currentColor" aria-hidden="true" />
        ) : (
          <Pause size={18} fill="currentColor" aria-hidden="true" />
        )}
      </button>
    </section>
  );
}

function DemonstracaoProduto() {
  const sectionRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLFieldSetElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const chapterFillRef = useRef<HTMLSpanElement>(null);
  const deviceCameraRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const visivel = useInView(sectionRef, { amount: 0.42 });
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaDemo>("falar");
  const [pausado, setPausado] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const etapa = ETAPAS.find((item) => item.id === etapaAtiva) ?? ETAPAS[0];
  const indiceAtivo = ETAPAS.findIndex((item) => item.id === etapaAtiva);
  const reproduzindo = Boolean(visivel && !pausado && !reducedMotion);

  useEffect(() => {
    if (reducedMotion) setPausado(true);
  }, [reducedMotion]);

  function selecionarEtapa(id: EtapaDemo) {
    setEtapaAtiva(id);
    setCiclo((valor) => valor + 1);
    if (!reducedMotion) setPausado(false);
  }

  function avancarEtapa() {
    const proximoIndice = (indiceAtivo + 1) % ETAPAS.length;
    const proximaEtapa = ETAPAS[proximoIndice];
    if (!proximaEtapa) return;
    setEtapaAtiva(proximaEtapa.id);
    setCiclo((valor) => valor + 1);
  }

  function reiniciarEtapa() {
    if (reducedMotion) return;
    setPausado(false);
    setCiclo((valor) => valor + 1);
    timelineRef.current?.restart();
  }

  function navegarEtapas(evento: React.KeyboardEvent<HTMLButtonElement>, indice: number) {
    let proximoIndice: number | null = null;

    if (evento.key === "ArrowRight" || evento.key === "ArrowDown") {
      proximoIndice = (indice + 1) % ETAPAS.length;
    } else if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") {
      proximoIndice = (indice - 1 + ETAPAS.length) % ETAPAS.length;
    } else if (evento.key === "Home") {
      proximoIndice = 0;
    } else if (evento.key === "End") {
      proximoIndice = ETAPAS.length - 1;
    }

    if (proximoIndice === null) return;
    evento.preventDefault();
    const proximaEtapa = ETAPAS[proximoIndice];
    if (!proximaEtapa) return;

    selecionarEtapa(proximaEtapa.id);
    window.requestAnimationFrame(() => document.getElementById(`aba-${proximaEtapa.id}`)?.focus());
  }

  useGSAP(
    () => {
      if (reducedMotion) {
        timelineRef.current = null;
        return;
      }

      const deviceFrom =
        etapaAtiva === "falar"
          ? { autoAlpha: 0, y: 34, scale: 0.9 }
          : etapaAtiva === "revisar"
            ? { autoAlpha: 0, x: 52, scale: 1.08 }
            : { autoAlpha: 0, y: 28, scale: 1 };
      const deviceTo =
        etapaAtiva === "falar"
          ? { autoAlpha: 1, x: 0, y: 0, scale: 1 }
          : etapaAtiva === "revisar"
            ? { autoAlpha: 1, x: 0, y: 0, scale: 1.04 }
            : { autoAlpha: 1, x: 0, y: -6, scale: 1.02 };

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
        onComplete: avancarEtapa,
      });
      const chapterFill = chapterFillRef.current;
      const deviceCamera = deviceCameraRef.current;

      timelineRef.current = timeline;
      if (chapterFill) {
        timeline
          .set(chapterFill, { willChange: "transform" }, 0)
          .fromTo(
            chapterFill,
            { scaleX: 0 },
            { scaleX: 1, duration: DEMO_DURATION_SECONDS, ease: "none" },
            0,
          )
          .set(chapterFill, { clearProps: "willChange" }, DEMO_DURATION_SECONDS);
      }

      if (deviceCamera) {
        timeline
          .set(deviceCamera, { willChange: "transform" }, 0)
          .fromTo(deviceCamera, deviceFrom, { ...deviceTo, duration: 1.1 }, 0)
          .set(deviceCamera, { clearProps: "willChange" }, 1.1);
      }

      return () => {
        timelineRef.current = null;
      };
    },
    {
      scope: playerRef,
      dependencies: [etapaAtiva, ciclo, reducedMotion],
      revertOnUpdate: true,
    },
  );

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || reducedMotion) return;

    if (reproduzindo) {
      timeline.play();
    } else {
      timeline.pause();
    }
  }, [ciclo, etapaAtiva, reducedMotion, reproduzindo]);

  return (
    <section
      className="v6-demo v61-demo"
      id="produto"
      aria-labelledby="v6-demo-title"
      ref={sectionRef}
    >
      <m.div
        className="v6-section-heading v6-section-heading-center"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.42, ease: EASE_OUT }}
      >
        <p className="v6-kicker">O produto em ação</p>
        <h2 id="v6-demo-title">Veja o Doniq transformar a visita em relatório.</h2>
        <p>Acompanhe o fluxo com componentes reais do aplicativo.</p>
      </m.div>

      <m.fieldset
        ref={playerRef}
        className={`v61-player ${reproduzindo ? "is-playing" : "is-paused"}`}
        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.48, ease: EASE_OUT }}
        aria-label="Demonstração simulada do uso do Doniq"
      >
        <legend className="v61-player-legend">Demonstração simulada do uso do Doniq</legend>
        <div className="v61-player-toolbar">
          <div>
            <img src="/doniq-wordmark-white.svg" alt="" width="82" height="25" />
            <span>Demonstração do aplicativo</span>
          </div>
          <div className="v61-player-actions">
            <span className="v61-muted-label">
              <VolumeX size={15} aria-hidden="true" />
              Sem áudio
            </span>
            {!reducedMotion && (
              <>
                <button
                  type="button"
                  onClick={reiniciarEtapa}
                  aria-label={`Reiniciar etapa ${etapa.titulo}`}
                  title={`Reiniciar etapa ${etapa.titulo}`}
                >
                  <RotateCcw size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPausado((valor) => !valor)}
                  aria-label={pausado ? "Reproduzir demonstração" : "Pausar demonstração"}
                  aria-pressed={pausado}
                  title={pausado ? "Reproduzir demonstração" : "Pausar demonstração"}
                >
                  {pausado ? (
                    <Play size={17} fill="currentColor" aria-hidden="true" />
                  ) : (
                    <Pause size={17} fill="currentColor" aria-hidden="true" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={etapa.id}
            id={`painel-${etapa.id}`}
            role="tabpanel"
            aria-labelledby={`aba-${etapa.id}`}
            className={`v61-scene v61-scene-${etapa.id}`}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <div className="v61-scene-copy">
              <p>
                <span>{etapa.numero}</span>
                {etapa.titulo}
              </p>
              <h3>{etapa.destaque}</h3>
              <p>{etapa.descricao}</p>
              <div className="v61-scene-caption">
                {etapa.id === "falar" && (
                  <>
                    <Mic2 size={18} aria-hidden="true" />
                    {reducedMotion ? (
                      <span className="v61-transcript-static">{TRANSCRICAO_DEMO}</span>
                    ) : (
                      <Typewriter
                        key={`transcricao-${ciclo}`}
                        speed="fast"
                        play={reproduzindo}
                        cursorClassName="v61-typewriter-cursor"
                        cursorBlinkRepeat={2}
                        aria-label={TRANSCRICAO_DEMO}
                      >
                        {TRANSCRICAO_DEMO}
                      </Typewriter>
                    )}
                  </>
                )}
                {etapa.id === "revisar" && (
                  <>
                    <span aria-hidden="true">1</span>
                    ajuste destacado para confirmação
                  </>
                )}
                {etapa.id === "feito" && (
                  <>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    relatório pronto para enviar ao CRM
                  </>
                )}
              </div>
            </div>

            <div className="v61-scene-visual">
              <div ref={deviceCameraRef} className="v61-device-camera">
                <TelaProduto
                  etapa={etapa.id}
                  alt={
                    etapa.id === "falar"
                      ? "Interface do Doniq preparada para registrar uma visita por voz"
                      : etapa.id === "revisar"
                        ? "Interface do Doniq destacando os campos que precisam de revisão"
                        : "Interface do Doniq confirmando a visita pronta para envio ao CRM"
                  }
                  loading="lazy"
                  recordingPlaying={reproduzindo}
                  recordingCycle={ciclo}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
            </div>
          </m.div>
        </AnimatePresence>

        <div className="v61-chapters" role="tablist" aria-label="Etapas do fluxo do Doniq">
          {ETAPAS.map((item, indice) => {
            const ativa = item.id === etapaAtiva;
            const concluida = indice < indiceAtivo;
            return (
              <button
                key={item.id}
                id={`aba-${item.id}`}
                type="button"
                role="tab"
                aria-selected={ativa}
                aria-controls={`painel-${item.id}`}
                tabIndex={ativa ? 0 : -1}
                className={`${ativa ? "is-active" : ""} ${concluida ? "is-complete" : ""}`}
                onClick={() => selecionarEtapa(item.id)}
                onKeyDown={(evento) => navegarEtapas(evento, indice)}
              >
                <span className="v61-chapter-progress" aria-hidden="true">
                  {ativa && (
                    <span
                      ref={chapterFillRef}
                      key={`${item.id}-${ciclo}`}
                      className="v61-chapter-fill"
                    />
                  )}
                </span>
                <span className="v61-chapter-number">{item.numero}</span>
                <strong>{item.titulo}</strong>
                <small>{item.descricao}</small>
              </button>
            );
          })}
        </div>
      </m.fieldset>

      <p className="v61-live-status" aria-live="polite">
        Etapa {etapa.numero} de 03: {etapa.titulo}.
      </p>
    </section>
  );
}

function AudioParaRelatorio() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="v61-transform-section" aria-labelledby="v61-transform-title">
      <m.div
        className="v6-section-heading v6-section-heading-center"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: 0.42, ease: EASE_OUT }}
      >
        <p className="v6-kicker">Áudio para Relatório</p>
        <h2 id="v61-transform-title">Fale como foi. O Doniq extrai o que importa.</h2>
        <p>Veja como um relato de 30 segundos após a reunião se transforma em uma ficha estruturada para o seu CRM.</p>
      </m.div>

      <div className="v61-transform-grid">
        {/* Lado Esquerdo: O Áudio */}
        <m.div
          className="v61-card-audio"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          <div className="v61-card-header">
            <span className="v61-tag-audio">
              <Mic2 size={15} aria-hidden="true" />
              Áudio da visita (0:38)
            </span>
            <span className="v61-card-status">Relato pós-visita (38s)</span>
          </div>

          <div className="v61-audio-quote">
            <p>
              “Acabei de sair da <strong>Clínica Horizonte</strong> com a <strong>Dra. Camila</strong>.
              Ela gostou bastante da demonstração da linha cirúrgica, mas disse que o prazo de entrega precisa
              bater com a cirurgia do dia 25. Pediu para eu retornar com a proposta ajustada até <strong>terça-feira às 10h</strong>.”
            </p>
          </div>

          <div className="v61-audio-footer">
            <div className="v61-mini-wave" aria-hidden="true">
              <span style={{ height: "45%" }} />
              <span style={{ height: "85%" }} />
              <span style={{ height: "60%" }} />
              <span style={{ height: "100%" }} />
              <span style={{ height: "70%" }} />
              <span style={{ height: "45%" }} />
              <span style={{ height: "90%" }} />
              <span style={{ height: "55%" }} />
              <span style={{ height: "35%" }} />
            </div>
            <span className="v61-audio-timing">Relato falado em linguagem natural</span>
          </div>
        </m.div>

        {/* Conector Central */}
        <div className="v61-transform-arrow" aria-hidden="true">
          <ArrowRight size={22} className="v61-arrow-desktop" />
          <span className="v61-arrow-label">Doniq organiza</span>
        </div>

        {/* Lado Direito: O Relatório */}
        <m.div
          className="v61-card-report"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT }}
        >
          <div className="v61-card-header">
            <span className="v61-tag-report">
              <FileCheck2 size={15} aria-hidden="true" />
              Relatório estruturado
            </span>
            <span className="v61-crm-ready">
              <CheckCircle2 size={14} aria-hidden="true" />
              Pronto para o CRM
            </span>
          </div>

          <div className="v61-report-fields">
            <div className="v61-report-field">
              <span className="v61-field-name">Cliente / Contato</span>
              <strong>Clínica Horizonte · Dra. Camila</strong>
            </div>

            <div className="v61-report-field">
              <span className="v61-field-name">Oportunidade</span>
              <span>Linha cirúrgica · Demonstração aprovada</span>
            </div>

            <div className="v61-report-field v61-field-highlight">
              <span className="v61-field-name">Próximo passo</span>
              <strong>Retornar com proposta ajustada · Terça, 10h</strong>
            </div>

            <div className="v61-report-field v61-field-review">
              <span className="v61-field-name">Ponto para sua confirmação</span>
              <span>Prazo de entrega compatível com cirurgia do dia 25</span>
            </div>
          </div>

          <div className="v61-report-footer">
            <span>Você confere e confirma com 1 toque.</span>
          </div>
        </m.div>
      </div>
    </section>
  );
}


const CRMS_PILOTO = [
  { id: "pipedrive", label: "Pipedrive" },
  { id: "rdstation", label: "RD Station" },
  { id: "ploomes", label: "Ploomes" },
  { id: "hubspot", label: "HubSpot" },
  { id: "agendor", label: "Agendor" },
  { id: "outro", label: "Outro" },
] as const;

const CRM_CONNECTORS = [
  "Pipedrive",
  "RD Station CRM",
  "HubSpot",
  "Ploomes",
  "Salesforce",
  "Agendor",
  "Moskit CRM",
  "Ollow",
] as const;

type PerfilPiloto = "autonomo" | "gestor";

function CrmEcosystemStrip() {
  return (
    <section className="v61-ecosystem-section" aria-labelledby="v61-eco-title">
      <div className="v61-ecosystem-container">
        <span className="v61-eco-tag">ECOSSISTEMA INTEGRADO</span>
        <h2 id="v61-eco-title" className="v61-eco-heading">
          Conectado diretamente ao CRM da sua equipe.
        </h2>
        <p className="v61-eco-sub">
          Sem trocar de ferramenta. O Doniq entrega a ficha estruturada no funil e na etapa certa via API oficial.
        </p>
        <div className="v61-crm-cards-grid">
          {CRM_CONNECTORS.map((crmItem) => (
            <div key={crmItem} className="v61-crm-badge-card">
              <div className="v61-crm-header-row">
                <span className="v61-crm-dot" aria-hidden="true" />
                <span className="v61-crm-name">{crmItem}</span>
              </div>
              <span className="v61-crm-status">Sincronização em 1 toque</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemVsSolutionSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="v61-contrast-section" id="comparativo" aria-labelledby="v61-contrast-title">
      <div className="v61-contrast-header">
        <p className="v6-kicker">O fim do gargalo de campo</p>
        <h2 id="v61-contrast-title">Por que as melhores oportunidades esfriam no caminho?</h2>
        <p className="v61-contrast-subtitle">
          O que acontece quando você depende de digitar no fim do dia versus relatar logo após a reunião.
        </p>
      </div>

      <div className="v61-contrast-grid">
        {/* Card Dor */}
        <m.div
          className="v61-contrast-card v61-card-pain"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          <div className="v61-pill-pain">
            <AlertCircle size={14} aria-hidden="true" />
            O Jeito Tradicional · Sem Doniq
          </div>
          <h3 className="v61-card-title-pain">O pesadelo da digitação no fim do dia</h3>
          <ul className="v61-contrast-list">
            <li>
              <span className="v61-icon-pain">✕</span>
              <div>
                <strong>1h+ no notebook à noite:</strong>
                <p>digitando relatórios maçantes no hotel ou em casa.</p>
              </div>
            </li>
            <li>
              <span className="v61-icon-pain">✕</span>
              <div>
                <strong>60% dos detalhes esquecidos:</strong>
                <p>objeções e combinados se perdem no caminho.</p>
              </div>
            </li>
            <li>
              <span className="v61-icon-pain">✕</span>
              <div>
                <strong>CRM desatualizado:</strong>
                <p>pipeline vazio gerando cobrança da liderança.</p>
              </div>
            </li>
          </ul>
        </m.div>

        {/* Card Ganho */}
        <m.div
          className="v61-contrast-card v61-card-gain"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, delay: 0.1, ease: EASE_OUT }}
        >
          <div className="v61-pill-gain">
            <Sparkles size={14} aria-hidden="true" />
            A Rotina Ágil · Com Doniq
          </div>
          <h3 className="v61-card-title-gain">30 segundos de voz logo após a visita</h3>
          <ul className="v61-contrast-list">
            <li>
              <span className="v61-icon-gain">✓</span>
              <div>
                <strong>30s de voz ao entrar no carro:</strong>
                <p>aperte o botão e relate com a memória fresca.</p>
              </div>
            </li>
            <li>
              <span className="v61-icon-gain">✓</span>
              <div>
                <strong>Extração instantânea:</strong>
                <p>decisores, valores e datas organizadas em segundos.</p>
              </div>
            </li>
            <li>
              <span className="v61-icon-gain">✓</span>
              <div>
                <strong>1 toque para validar:</strong>
                <p>revise na tela e sincronize direto no seu CRM.</p>
              </div>
            </li>
          </ul>
        </m.div>
      </div>
    </section>
  );
}

function ManagerCockpitSection() {
  return (
    <section className="v61-manager-section" id="gestao" aria-labelledby="v61-mgr-title">
      <div className="v61-manager-container">
        <div className="v61-manager-header">
          <p className="v6-kicker">Para Gestores e Diretores Comerciais</p>
          <h2 id="v61-mgr-title">Visibilidade total da equipe sem vigilância invasiva.</h2>
          <p className="v61-manager-sub">
            A liderança ganha histórico padronizado no CRM e indicadores de campo em tempo real,
            sem burocracia e com a confiança inegociável da equipe.
          </p>
        </div>

        {/* Grade de 4 Métricas de Produtividade */}
        <div className="v61-metrics-grid" aria-label="Métricas de produtividade comprovada">
          <div className="v61-metric-card">
            <span className="v61-metric-val">30s</span>
            <span className="v61-metric-label">tempo médio por relato pós-visita</span>
          </div>
          <div className="v61-metric-card">
            <span className="v61-metric-val">1h15</span>
            <span className="v61-metric-label">economizada por vendedor ao dia</span>
          </div>
          <div className="v61-metric-card">
            <span className="v61-metric-val">+85%</span>
            <span className="v61-metric-label">de visitas registradas no mesmo dia</span>
          </div>
          <div className="v61-metric-card">
            <span className="v61-metric-val">Zero</span>
            <span className="v61-metric-label">digitação manual no notebook</span>
          </div>
        </div>

        {/* Funcionalidades da Gestão */}
        <div className="v61-manager-features-grid">
          <div className="v61-mgr-feature-card">
            <div className="v61-feature-icon">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <h3>Pacto de Privacidade LGPD</h3>
            <p>
              Áudios são sintetizados e <strong>descartados imediatamente</strong>.
              A gestão visualiza indicadores de negócio, nunca escuta gravações.
            </p>
          </div>
          <div className="v61-mgr-feature-card">
            <div className="v61-feature-icon">
              <TrendingUp size={22} aria-hidden="true" />
            </div>
            <h3>Radar de Objeções ao Vivo</h3>
            <p>
              Descubra quais objeções de preço ou concorrentes estão travando vendas na ponta para orientar a equipe.
            </p>
          </div>
          <div className="v61-mgr-feature-card">
            <div className="v61-feature-icon">
              <Zap size={22} aria-hidden="true" />
            </div>
            <h3>SLA de Retomada</h3>
            <p>
              Alertas de follow-up para evitar que propostas esfriem, com roteiros sugeridos de reativação via WhatsApp.
            </p>
          </div>
        </div>

        <div className="v61-mgr-cta-bar">
          <div className="v61-mgr-cta-text">
            <strong>Quer ver o Cockpit da Gestão em funcionamento?</strong>
            <span>Acesse a demonstração interativa com indicadores reais de equipe.</span>
          </div>
          <a href="/gestao" className="v6-button v6-button-secondary v61-mgr-btn">
            Conhecer Cockpit da Gestão
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

export default function LandingMotionSpV61() {
  usePageTitle("Relato de visita comercial");
  const { track } = useAnalytics();

  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<PerfilPiloto>("autonomo");
  const [crm, setCrm] = useState<string>("pipedrive");
  const [estado, setEstado] = useState<EstadoFormulario>("idle");
  const emailRef = useRef<HTMLInputElement>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!email.trim() || estado === "enviando") return;

    setEstado("enviando");
    track({ evento: "formulario_enviado", propriedades: { perfil, crm } });
    try {
      const segmentoPayload = `${perfil}:${crm}`;
      const resposta = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          segmento: segmentoPayload,
        }),
      });
      if (!resposta.ok) throw new Error("Falha ao enviar");
      setEstado("ok");
    } catch {
      setEstado("erro");
      window.requestAnimationFrame(() => emailRef.current?.focus());
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <div className="v6 v61">
          <a className="v6-skip" href="#conteudo">
            Ir para o conteúdo
          </a>

          <main id="conteudo" tabIndex={-1}>
            <Hero />

            {/* ATO 2: Faixa de compatibilidade de CRMs (Social Proof) */}
            <CrmEcosystemStrip />
            <div className="v61-section-divider" aria-hidden="true" />

            {/* ATO 3: O contraste de campo (Sem Doniq vs Com Doniq) */}
            <ProblemVsSolutionSection />
            <div className="v61-section-divider" aria-hidden="true" />

            {/* ATO 4: Demonstração interativa do produto (Falar -> Revisar -> Feito) */}
            <DemonstracaoProduto />
            <div className="v61-section-divider" aria-hidden="true" />

            {/* ATO 5: Do áudio falado ao relatório estruturado no CRM */}
            <AudioParaRelatorio />
            <div className="v61-section-divider" aria-hidden="true" />

            {/* ATO 6: Inteligência e controle para diretores e gestores comerciais */}
            <ManagerCockpitSection />
            <div className="v61-section-divider" aria-hidden="true" />

            {/* ATO 7: Conversão do Piloto com Garantia Ética de 80% */}
            <section className="v6-pilot" id="piloto" aria-labelledby="v6-pilot-title">
              <div className="v6-pilot-media" aria-hidden="true">
                <img
                  src="/doniq-representante-sp-hero-v15-feito-poster.jpg"
                  alt=""
                  width="1280"
                  height="720"
                  loading="lazy"
                />
              </div>
              <div className="v6-pilot-shade" aria-hidden="true" />

              <div className="v6-pilot-inner">
                <m.div
                  className="v6-pilot-copy"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: 0.42, ease: EASE_OUT }}
                >
                  <p className="v6-kicker">Acesso antecipado ao piloto de campo</p>
                  <h2 id="v6-pilot-title">Leve o Doniq para sua equipe externa por 7 dias.</h2>
                  <p>
                    Estamos liberando acesso antecipado para representantes comerciais e equipes de vendas externas.
                    Teste na sua rotina com acompanhamento de especialistas e integração ao seu CRM.
                  </p>
                  <div className="v61-guarantee-banner">
                    <ShieldCheck size={20} aria-hidden="true" />
                    <div>
                      <strong>Garantia Ética de Adesão de 80%:</strong> Se sua equipe não registrar
                      mais de 80% das visitas na primeira semana, o piloto é 100% gratuito e sem compromisso.
                    </div>
                  </div>
                </m.div>

                <AnimatePresence initial={false} mode="wait">
                  {estado === "ok" ? (
                    <m.output
                      key="sucesso"
                      className="v6-success v61-success-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28, ease: EASE_OUT }}
                    >
                      <div className="v61-success-top">
                        <CheckCircle2 size={26} className="v61-success-icon" aria-hidden="true" />
                        <div>
                          <strong>Interesse registrado no piloto!</strong>
                          <p>
                            Recebemos seus dados. Entraremos em contato para liberar o seu acesso à
                            primeira rodada de testes.
                          </p>
                        </div>
                      </div>
                      <div className="v61-success-cta">
                        <span>Quer ver o produto em ação agora mesmo?</span>
                        <a href="/demo/mobile" className="v6-button v6-button-primary v61-success-btn">
                          Abrir demonstração interativa
                          <ArrowRight size={16} aria-hidden="true" />
                        </a>
                      </div>
                    </m.output>
                  ) : (
                    <m.form
                      key="formulario"
                      className="v6-form v61-form-enhanced"
                      onSubmit={enviar}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.24, ease: EASE_OUT }}
                    >
                      <fieldset className="v61-form-fieldgroup">
                        <legend className="v61-field-legend">Seu perfil</legend>
                        <div className="v61-segmented-control" role="radiogroup" aria-label="Perfil do usuário">
                          <label
                            className={`v61-segment ${perfil === "autonomo" ? "is-selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="perfil"
                              value="autonomo"
                              checked={perfil === "autonomo"}
                              onChange={() => setPerfil("autonomo")}
                              className="v61-segment-input"
                              aria-label="Representante autônomo"
                            />
                            <span className="v61-segment-indicator" aria-hidden="true" />
                            Representante autônomo
                          </label>
                          <label
                            className={`v61-segment ${perfil === "gestor" ? "is-selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="perfil"
                              value="gestor"
                              checked={perfil === "gestor"}
                              onChange={() => setPerfil("gestor")}
                              className="v61-segment-input"
                              aria-label="Gestor / Líder de equipe"
                            />
                            <span className="v61-segment-indicator" aria-hidden="true" />
                            Gestor / Líder de equipe
                          </label>
                        </div>
                      </fieldset>

                      <fieldset className="v61-form-fieldgroup">
                        <legend className="v61-field-legend">Qual CRM você usa hoje?</legend>
                        <div className="v61-crm-pills" role="radiogroup" aria-label="CRM utilizado">
                          {CRMS_PILOTO.map((item) => (
                            <label
                              key={item.id}
                              className={`v61-crm-pill ${crm === item.id ? "is-selected" : ""}`}
                            >
                              <input
                                type="radio"
                                name="crm"
                                value={item.id}
                                checked={crm === item.id}
                                onChange={() => setCrm(item.id)}
                                className="v61-crm-pill-input"
                                aria-label={item.label}
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className="v61-form-email-group">
                        <label htmlFor="v6-email">Seu e-mail profissional</label>
                        <div className="v61-email-input-row">
                          <input
                            ref={emailRef}
                            id="v6-email"
                            name="email"
                            type="email"
                            aria-label="Seu e-mail profissional"
                            autoComplete="email"
                            required
                            value={email}
                            aria-invalid={estado === "erro"}
                            aria-describedby={
                              estado === "erro" ? "v6-email-error v6-email-note" : "v6-email-note"
                            }
                            onChange={(evento) => {
                              setEmail(evento.target.value);
                              if (estado === "erro") setEstado("idle");
                            }}
                            placeholder="voce@empresa.com.br"
                          />
                          <button
                            type="submit"
                            className="v61-submit-btn"
                            disabled={estado === "enviando"}
                            aria-busy={estado === "enviando"}
                          >
                            {estado === "enviando" ? "Enviando..." : "Quero participar do piloto"}
                            {estado !== "enviando" && <ArrowRight size={18} aria-hidden="true" />}
                          </button>
                        </div>
                      </div>
                      {estado === "erro" && (
                        <p className="v6-form-error" id="v6-email-error" role="alert">
                          Não foi possível enviar agora. Tente novamente.
                        </p>
                      )}
                      <p id="v6-email-note">
                        Ao enviar, você concorda em receber contato sobre o piloto.{" "}
                        <Link href="/privacidade">Leia o aviso de privacidade.</Link>
                      </p>
                    </m.form>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </main>

          <footer className="v6-footer">
            <img src="/doniq-wordmark-white.svg" alt="Doniq" width="94" height="28" />
            <p>Falou, tá feito.</p>
            <Link href="/privacidade">Segurança e privacidade</Link>
          </footer>
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}
