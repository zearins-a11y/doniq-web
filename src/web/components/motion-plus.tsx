import React, { useEffect, useState } from "react";

export interface AnimateNumberProps {
  children: React.ReactNode;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * Componente nativo de contagem animada (substituto 100% autocontido para motion-plus/react).
 * Anima suavemente de 0 até o valor alvo com easing exponencial (ease-out).
 */
export const AnimateNumber: React.FC<AnimateNumberProps> = ({
  children,
  suffix = "",
  prefix = "",
  className,
}) => {
  const target = typeof children === "number" ? children : Number(children) || 0;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200; // 1.2s smooth easing

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <span className={className}>
      {prefix}
      {current}
      {suffix}
    </span>
  );
};

export interface TypewriterProps {
  children: string;
  speed?: "slow" | "normal" | "fast" | number;
  play?: boolean;
  cursorClassName?: string;
  cursorBlinkRepeat?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Componente de máquina de escrever nativo com cursor pulsante.
 */
export const Typewriter: React.FC<TypewriterProps> = ({
  children,
  speed = "fast",
  play = true,
  cursorClassName,
  className,
  "aria-label": ariaLabel,
}) => {
  const text = typeof children === "string" ? children : "";
  const [displayed, setDisplayed] = useState(play ? "" : text);

  useEffect(() => {
    if (!play) {
      setDisplayed(text);
      return;
    }
    setDisplayed("");
    let index = 0;
    const delay = speed === "fast" ? 22 : speed === "slow" ? 60 : 35;
    const interval = setInterval(() => {
      index++;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, play, speed]);

  return (
    <span className={className} aria-label={ariaLabel ?? text}>
      {displayed}
      {displayed.length < text.length && (
        <span
          className={
            cursorClassName ??
            "inline-block w-1.5 h-4 ml-0.5 bg-current align-middle animate-pulse"
          }
        />
      )}
    </span>
  );
};

export interface TickerProps {
  items: React.ReactNode[];
  velocity?: number;
  gap?: number;
  fade?: number;
  className?: string;
}

/**
 * Ticker / Carrossel contínuo nativo com efeito fade nas bordas.
 */
export const Ticker: React.FC<TickerProps> = ({ items, gap = 12, className }) => {
  return (
    <div
      className={`relative overflow-hidden flex items-center ${className ?? ""}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        className="flex shrink-0 items-center animate-doniq-ticker"
        style={{ gap: `${gap}px` }}
      >
        {items.map((item, idx) => (
          <React.Fragment key={`ticker-1-${idx}`}>{item}</React.Fragment>
        ))}
      </div>
      <div
        className="flex shrink-0 items-center animate-doniq-ticker"
        style={{ gap: `${gap}px`, paddingLeft: `${gap}px` }}
        aria-hidden="true"
      >
        {items.map((item, idx) => (
          <React.Fragment key={`ticker-2-${idx}`}>{item}</React.Fragment>
        ))}
      </div>
    </div>
  );
};
