import type { CSSProperties } from "react";
import type { EstadoVoz } from "../../shared/estado-voz";
import "./onda-voz.css";

export const ALTURAS_ONDA_VOZ = [
  10, 16, 24, 12, 20, 28, 14, 22, 18, 26, 12, 20,
] as const;

type VariaveisOnda = CSSProperties & {
  "--onda-voz-nivel": number;
};

type OndaVozProps = {
  ativa?: boolean;
  className?: string;
  estado?: EstadoVoz;
  modo?: "animada" | "nivel";
  nivel?: number;
  pausada?: boolean;
  style?: CSSProperties;
};

export function OndaVoz({
  ativa = true,
  className = "",
  estado = "pronto",
  modo = "animada",
  nivel = 1,
  pausada = false,
  style,
}: OndaVozProps) {
  const nivelLimitado = Math.min(1, Math.max(0, nivel));

  return (
    <div
      className={`onda-voz${className ? ` ${className}` : ""}`}
      data-ativa={ativa}
      data-estado={estado}
      data-modo={modo}
      data-pausada={pausada}
      aria-hidden="true"
      style={
        {
          ...style,
          "--onda-voz-nivel": nivelLimitado,
        } as VariaveisOnda
      }
    >
      {ALTURAS_ONDA_VOZ.map((altura, indice) => (
        <span
          className="onda-voz-barra"
          key={`${altura}-${indice}`}
          style={
            {
              "--onda-voz-altura": `${altura}px`,
              "--onda-voz-atraso": `${indice * 0.1}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
