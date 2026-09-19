import { type ComponentType, useEffect, useState } from "react";
import { ROTULO_TEMA, type Tema, aplicarTema, proximoTema, temaSalvo } from "../lib/tema";
import { TemaAuto, TemaClaro, TemaEscuro } from "./icones";

const ICONE: Record<Tema, ComponentType<{ s?: number }>> = {
  sistema: TemaAuto,
  claro: TemaClaro,
  escuro: TemaEscuro,
};

/** Alterna automático -> claro -> escuro. O rótulo vai no title para leitor de tela. */
export function BotaoTema() {
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    const salvo = temaSalvo();
    setTema(salvo);
    aplicarTema(salvo);
  }, []);

  const Icone = ICONE[tema];

  return (
    <button
      type="button"
      className="btn-tema"
      title={ROTULO_TEMA[tema]}
      aria-label={ROTULO_TEMA[tema]}
      onClick={() => {
        const proximo = proximoTema(tema);
        setTema(proximo);
        aplicarTema(proximo);
      }}
    >
      <Icone />
    </button>
  );
}
