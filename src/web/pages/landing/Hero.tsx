/**
 * Hero - Seção principal da landing page v6.2
 *
 * Contém:
 * - Eyebrow com ícone lucide
 * - Headline com gradiente
 * - Subheadline
 * - Prova social
 * - CTAs (primário e secundário)
 * - Disclosure pós-CTA
 * - Vídeo contextual em plano de fundo
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useInView } from "motion/react";
import { Mic2, ArrowRight, Pause, Play } from "lucide-react";

const EASE_OUT: readonly [number, number, number, number] = [0.22, 1, 0.36, 1];

interface HeroProps {
  onCtaClick?: () => void;
}

export function Hero({ onCtaClick }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const isInView = useInView(heroRef, { amount: 0.1 });
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showProduct, setShowProduct] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reducedMotion) {
      video.pause();
      setVideoPlaying(false);
      setShowProduct(true);
      return;
    }

    setShowProduct(false);
    void video.play().catch(() => setVideoPlaying(false));
  }, [reducedMotion]);

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.ended) {
        video.currentTime = 0;
      }
      setShowProduct(false);
      void video.play();
    } else {
      video.pause();
    }
  }

  return (
    <section
      className={`hero${showProduct ? " hero-product-visible" : ""}`}
      id="inicio"
      ref={heroRef}
      aria-labelledby="hero-headline"
    >
      <video
        ref={videoRef}
        className="hero-background-video"
        autoPlay={!reducedMotion}
        muted
        playsInline
        preload="metadata"
        poster="/doniq-representante-sp-hero-matchcut-poster.jpg"
        aria-label="Representante registrando uma visita comercial por voz"
        aria-describedby="hero-media-description"
        onPlay={() => {
          setVideoPlaying(true);
          setShowProduct(false);
        }}
        onPause={() => setVideoPlaying(false)}
        onEnded={() => {
          setVideoPlaying(false);
          setShowProduct(true);
        }}
      >
        <source
          src="/doniq-representante-sp-hero-matchcut-source.mp4"
          type="video/mp4"
        />
      </video>

      <div className="hero-gradient" aria-hidden="true" />

      <AnimatePresence initial={false}>
        {showProduct ? (
          <motion.figure
            className="hero-product-result"
            initial={reducedMotion ? false : { opacity: 0, x: 48, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
              reducedMotion
                ? undefined
                : {
                    opacity: 0,
                    x: 24,
                    scale: 0.98,
                    transition: { duration: 0.24, ease: EASE_OUT },
                  }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: EASE_OUT }
            }
          >
            <img
              src="/doniq-v15-feito.png"
              alt="Tela real do Doniq com o relato pronto para revisar e enviar ao CRM"
              width="780"
              height="1690"
            />
            <figcaption>Relato pronto no Doniq</figcaption>
          </motion.figure>
        ) : null}
      </AnimatePresence>

      <div className="hero-content container">
        <motion.div
          className="hero-copy"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.56, ease: EASE_OUT }}
        >
          {/* Eyebrow */}
          <p className="hero-eyebrow">
            <Mic2 size={14} aria-hidden="true" />
            Pós-visita comercial
          </p>

          {/* Headline */}
          <h1 id="hero-headline" className="hero-headline">
            A visita termina.
            <br />
            <span className="hero-headline-accent">
              Você fala. O Doniq organiza.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="hero-subtitle">
            Em 30 segundos, revise o relato e envie ao CRM conectado sem preencher tudo
            de novo.
          </p>

          {/* Prova operacional */}
          <p className="hero-social-proof">
            Relato por voz &middot; revisão humana &middot; envio ao CRM
          </p>

          {/* Actions */}
          <div className="hero-actions">
            <a
              href="#piloto"
              className="hero-cta-primary"
              onClick={onCtaClick}
            >
              Quero participar do piloto
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#demo" className="hero-cta-secondary">
              Ver o produto
            </a>
          </div>
        </motion.div>
      </div>

      <button
        className="hero-video-control"
        type="button"
        onClick={toggleVideo}
        aria-label={videoPlaying ? "Pausar vídeo de fundo" : "Reproduzir vídeo de fundo"}
      >
        {videoPlaying ? (
          <Pause size={17} aria-hidden="true" />
        ) : (
          <Play size={17} aria-hidden="true" />
        )}
      </button>

      <p id="hero-media-description" className="visually-hidden">
        Representante registra uma visita comercial por voz após a reunião.
      </p>
      <span className="visually-hidden" aria-live="polite">
        {showProduct ? "Vídeo concluído. Tela real do aplicativo exibida." : ""}
      </span>
    </section>
  );
}

export default Hero;
