/**
 * AudioTypewriter - Typewriter com velocidade variável para a Demo de Áudio
 * Sincroniza palavras-chave detectadas com campos da ficha estruturada
 *
 * Usa Motion para animações de texto quando disponível
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";

interface EntidadeSincronizada {
  texto: string;
  inicio: number;
  fim: number;
  campoId: string;
}

interface AudioTypewriterProps {
  texto: string;
  entidades: EntidadeSincronizada[];
  velocidadeBase?: number;
  velocidadeNomes?: number;
  onEntidadeDetectada?: (campoId: string) => void;
  onCompleto?: () => void;
  className?: string;
  reduzMotion?: boolean;
}

const VELOCIDADE_PADRAO = 40; // ms por caractere para palavras comuns
const VELOCIDADE_NOME = 80; // ms por caractere para nomes próprios

export function AudioTypewriter({
  texto,
  entidades,
  velocidadeBase = VELOCIDADE_PADRAO,
  velocidadeNomes = VELOCIDADE_NOME,
  onEntidadeDetectada,
  onCompleto,
  className,
  reduzMotion = false,
}: AudioTypewriterProps) {
  const [textoExibido, setTextoExibido] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion() || reduzMotion;

  // Detectar se uma palavra é um nome próprio (começa com maiúscula)
  const isNomeProprio = useCallback((palavra: string): boolean => {
    const primeiraLetra = palavra[0];
    return (
      primeiraLetra === primeiraLetra.toUpperCase() &&
      primeiraLetra !== primeiraLetra.toLowerCase()
    );
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      // Modo sem movimento: mostra o texto inteiro de uma vez
      setTextoExibido(texto);
      // Detecta todas as entidades imediatamente
      entidades.forEach((e) => {
        onEntidadeDetectada?.(e.campoId);
      });
      onCompleto?.();
      return;
    }

    // Reset
    setTextoExibido("");

    let indiceAtual = 0;
    let entidadesJaDetectadas = new Set<string>();

    function tick() {
      if (indiceAtual >= texto.length) {
        setTextoExibido(texto);
        onCompleto?.();
        return;
      }

      // Pega a palavra atual para determinar velocidade
      const ateFim = texto.slice(indiceAtual);
      const matchPalavra = ateFim.match(/^([\wÀ-ÿ]+)/);
      const palavraAtual = matchPalavra ? matchPalavra[0] : texto[indiceAtual];
      const vel = isNomeProprio(palavraAtual) ? velocidadeNomes : velocidadeBase;

      const novoIndice = indiceAtual + 1;
      setTextoExibido(texto.slice(0, novoIndice));

      // Verifica se alguma entidade foi alcançada
      entidades.forEach((entidade) => {
        if (
          !entidadesJaDetectadas.has(entidade.campoId) &&
          indiceAtual >= entidade.inicio &&
          indiceAtual < entidade.fim
        ) {
          entidadesJaDetectadas.add(entidade.campoId);
          onEntidadeDetectada?.(entidade.campoId);
        }
      });

      indiceAtual = novoIndice;
      timeoutRef.current = setTimeout(tick, vel);
    }

    timeoutRef.current = setTimeout(tick, velocidadeBase);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    texto,
    entidades,
    velocidadeBase,
    velocidadeNomes,
    reducedMotion,
    onEntidadeDetectada,
    onCompleto,
    isNomeProprio,
  ]);

  return (
    <div ref={containerRef} className={`audio-typewriter ${className || ""}`}>
      <span className="typewriter-texto">
        {textoExibido}
        {!reducedMotion && textoExibido.length < texto.length && (
          <motion.span
            className="typewriter-cursor"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            aria-hidden="true"
          >
            |
          </motion.span>
        )}
      </span>
    </div>
  );
}

/**
 * Componente de highlight sincronizado para campos da ficha
 * Brilha quando a entidade correspondente é detectada
 */
interface CampoSincronizadoProps {
  id: string;
  label: string;
  valor: string;
  ativo: boolean;
  detectado: boolean;
}

export function CampoSincronizado({
  id,
  label,
  valor,
  ativo,
  detectado,
}: CampoSincronizadoProps) {
  return (
    <motion.div
      id={`campo-${id}`}
      className={`campo-sincronizado ${detectado ? "detectado" : ""} ${ativo ? "ativo" : ""}`}
      layoutId={`campo-highlight-${id}`}
      initial={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
      animate={{
        backgroundColor: ativo
          ? "rgba(22, 140, 255, 0.15)"
          : detectado
            ? "rgba(61, 186, 140, 0.08)"
            : "rgba(0, 0, 0, 0)",
        borderColor: ativo
          ? "var(--acento)"
          : detectado
            ? "var(--v6-ok)"
            : "var(--v6-borda)",
      }}
      transition={{ duration: 0.3 }}
    >
      <span className="campo-label">{label}</span>
      <strong className="campo-valor">{valor}</strong>
      {detectado && !ativo && (
        <motion.span
          className="campo-check"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="var(--v6-ok)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      )}
    </motion.div>
  );
}

export default AudioTypewriter;
