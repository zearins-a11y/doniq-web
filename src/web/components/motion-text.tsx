import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function AnimateNumber({ children: valor }: { children: number }) {
  const reduzirMovimento = useReducedMotion();
  const valorAnterior = useRef(valor);
  const [valorVisivel, setValorVisivel] = useState(valor);

  useEffect(() => {
    if (reduzirMovimento) {
      valorAnterior.current = valor;
      setValorVisivel(valor);
      return;
    }

    const controle = animate(valorAnterior.current, valor, {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (atual) => setValorVisivel(Math.round(atual)),
    });
    valorAnterior.current = valor;
    return () => controle.stop();
  }, [reduzirMovimento, valor]);

  return (
    <span aria-label={String(valor)}>
      <span aria-hidden="true">{valorVisivel}</span>
    </span>
  );
}

interface TypewriterProps {
  children: string;
  play?: boolean;
  speed?: "fast" | "normal" | number;
  cursorClassName?: string;
  cursorBlinkRepeat?: number;
  "aria-label"?: string;
}

export function Typewriter({
  children: texto,
  play = true,
  speed = "normal",
  cursorClassName,
  cursorBlinkRepeat = 2,
  "aria-label": ariaLabel,
}: TypewriterProps) {
  const reduzirMovimento = useReducedMotion();
  const [caracteresVisiveis, setCaracteresVisiveis] = useState(
    reduzirMovimento ? texto.length : 0,
  );

  useEffect(() => {
    setCaracteresVisiveis(reduzirMovimento ? texto.length : 0);
  }, [reduzirMovimento, texto]);

  useEffect(() => {
    if (reduzirMovimento || !play || caracteresVisiveis >= texto.length) return;
    const intervalo = window.setInterval(
      () => setCaracteresVisiveis((atual) => Math.min(atual + 1, texto.length)),
      speed === "fast" ? 18 : speed === "normal" ? 36 : speed,
    );
    return () => window.clearInterval(intervalo);
  }, [caracteresVisiveis, play, reduzirMovimento, speed, texto.length]);

  return (
    <span aria-label={ariaLabel ?? texto}>
      <span aria-hidden="true">{texto.slice(0, caracteresVisiveis)}</span>
      {!reduzirMovimento && caracteresVisiveis < texto.length && (
        <span
          aria-hidden="true"
          className={cursorClassName}
          style={{ animationIterationCount: cursorBlinkRepeat }}
        >
          |
        </span>
      )}
    </span>
  );
}
