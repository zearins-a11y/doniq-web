import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check, ChevronRight, FileCheck2, Mic2, Send } from "lucide-react";

type DemoStage = {
  id: "falar" | "revisar" | "feito";
  label: string;
  title: string;
  description: string;
  meta: string;
  image: string;
  alt: string;
  icon: ReactNode;
};

const DEMO_STAGES: DemoStage[] = [
  {
    id: "falar",
    label: "Falar",
    title: "Conte a visita com a memória fresca.",
    description:
      "O Doniq acompanha a sua fala e mantém o relato visível enquanto você registra decisões e próximos passos.",
    meta: "Relato por voz · 38 segundos",
    image: "/doniq-v15-falar.png",
    alt: "Tela real do Doniq durante o registro por voz",
    icon: <Mic2 size={18} aria-hidden="true" />,
  },
  {
    id: "revisar",
    label: "Revisar",
    title: "Confira a ficha antes de continuar.",
    description:
      "Empresa, contato, contexto e ação combinada aparecem organizados para uma revisão humana rápida.",
    meta: "Clínica Horizonte · Dra. Camila",
    image: "/doniq-v15-revisar.png",
    alt: "Tela real do Doniq com o relato estruturado para revisão",
    icon: <FileCheck2 size={18} aria-hidden="true" />,
  },
  {
    id: "feito",
    label: "Enviar",
    title: "Leve o registro ao CRM conectado.",
    description:
      "Depois do seu OK, o relato segue pelo conector disponível no piloto sem preencher tudo de novo.",
    meta: "Pronto para sincronizar com o CRM",
    image: "/doniq-v15-feito.png",
    alt: "Tela real do Doniq com o relato pronto para enviar ao CRM",
    icon: <Send size={18} aria-hidden="true" />,
  },
];

type DemoStepProps = {
  stage: DemoStage;
  index: number;
  active: boolean;
  reducedMotion: boolean;
  autoActivate: boolean;
  onActivate: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
};

function DemoStep({
  stage,
  index,
  active,
  reducedMotion,
  autoActivate,
  onActivate,
  onKeyDown,
  buttonRef,
}: DemoStepProps) {
  const stepRef = useRef<HTMLButtonElement | null>(null);
  const isInView = useInView(stepRef, {
    amount: 0.68,
    margin: "-12% 0px -12% 0px",
  });

  useEffect(() => {
    if (isInView && autoActivate && !reducedMotion) {
      onActivate(index);
    }
  }, [autoActivate, index, isInView, onActivate, reducedMotion]);

  const setRefs = useCallback(
    (element: HTMLButtonElement | null) => {
      stepRef.current = element;
      buttonRef(element);
    },
    [buttonRef],
  );

  return (
    <button
      ref={setRefs}
      type="button"
      className={`demo-step${active ? " is-active" : ""}`}
      role="tab"
      id={`demo-tab-${stage.id}`}
      aria-selected={active}
      aria-controls="demo-product-panel"
      tabIndex={active ? 0 : -1}
      onClick={() => onActivate(index)}
      onKeyDown={(event) => onKeyDown(event, index)}
    >
      {active &&
        (reducedMotion ? (
          <span className="demo-step-glass" aria-hidden="true" />
        ) : (
          <motion.span
            className="demo-step-glass"
            layoutId="demo-stage-glass"
            transition={{
              type: "tween",
              duration: 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-hidden="true"
          />
        ))}
      <span className="demo-step-index">0{index + 1}</span>
      <span className="demo-step-icon">{stage.icon}</span>
      <span className="demo-step-copy">
        <strong>{stage.title}</strong>
        <span className="demo-step-mobile-label">{stage.label}</span>
        <span className="demo-step-description">{stage.description}</span>
        <small>{stage.meta}</small>
      </span>
      <ChevronRight className="demo-step-arrow" size={18} aria-hidden="true" />
    </button>
  );
}

export function DemoAudio() {
  const reducedMotion = useReducedMotion();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeStage, setActiveStage] = useState(0);
  const [desktopJourney, setDesktopJourney] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const update = () => setDesktopJourney(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const activateStage = useCallback((index: number) => {
    setActiveStage(index);
  }, []);

  const handleStepKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex = index;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = (index + 1) % DEMO_STAGES.length;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = (index - 1 + DEMO_STAGES.length) % DEMO_STAGES.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = DEMO_STAGES.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      setActiveStage(nextIndex);
      buttonRefs.current[nextIndex]?.focus();
    },
    [],
  );

  const stage = DEMO_STAGES[activeStage];
  const motionTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section id="demo" className="demo-audio" aria-labelledby="demo-audio-title">
      <div className="container">
        <motion.div
          className="section-header demo-audio-header"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={motionTransition}
        >
          <p className="section-eyebrow">
            <Mic2 size={14} aria-hidden="true" />
            Produto em movimento
          </p>
          <h2 id="demo-audio-title" className="section-title">
            Da sua voz ao CRM, sem quebrar o ritmo.
          </h2>
          <p className="section-subtitle">
            Role ou escolha uma etapa para acompanhar o mesmo relato nas telas reais do Doniq.
          </p>
        </motion.div>

        <div className="demo-journey">
          <div
            className="demo-steps"
            role="tablist"
            aria-label="Etapas do relato no Doniq"
            aria-orientation={desktopJourney ? "vertical" : "horizontal"}
          >
            {DEMO_STAGES.map((item, index) => (
              <DemoStep
                key={item.id}
                stage={item}
                index={index}
                active={activeStage === index}
                reducedMotion={Boolean(reducedMotion)}
                autoActivate={desktopJourney}
                onActivate={activateStage}
                onKeyDown={handleStepKeyDown}
                buttonRef={(element) => {
                  buttonRefs.current[index] = element;
                }}
              />
            ))}
          </div>

          <div className="demo-product-stage">
            <div className="demo-product-progress" aria-hidden="true">
              {DEMO_STAGES.map((item, index) => (
                <span key={item.id} className={index <= activeStage ? "is-complete" : undefined}>
                  {index < activeStage ? <Check size={12} /> : index + 1}
                </span>
              ))}
            </div>

            <div
              id="demo-product-panel"
              className="demo-product-panel"
              role="tabpanel"
              aria-labelledby={`demo-tab-${stage.id}`}
            >
              <div className="demo-phone" aria-live="polite">
                <AnimatePresence initial={false} mode="wait">
                  <motion.img
                    key={stage.id}
                    src={stage.image}
                    alt={stage.alt}
                    initial={
                      reducedMotion
                        ? false
                        : {
                            opacity: 0,
                            clipPath: "inset(0 0 12% 0 round 28px)",
                            scale: 1.035,
                          }
                    }
                    animate={{
                      opacity: 1,
                      clipPath: "inset(0 0 0% 0 round 28px)",
                      scale: 1,
                    }}
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            clipPath: "inset(12% 0 0 0 round 28px)",
                            scale: 0.985,
                          }
                    }
                    transition={motionTransition}
                  />
                </AnimatePresence>
              </div>

              <div className="demo-product-caption">
                <span>{stage.icon}</span>
                <div>
                  <strong>{stage.label}</strong>
                  <p>{stage.description}</p>
                </div>
              </div>
            </div>

            <p className="demo-product-proof">
              <Check size={15} aria-hidden="true" />
              Capturas da versão real do aplicativo, sem reconstrução visual.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DemoAudio;
