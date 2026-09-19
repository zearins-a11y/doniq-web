/**
 * Ícones e ilustrações de marca DONIQ.
 *
 * O kit veio desenhado sobre ladrilho ink navy com hex fixo, que só funciona no
 * tema escuro — e o padrão do app é claro. Aqui o desenho é o mesmo, mas a
 * moldura sai dos tokens (`--via`, `--borda`) e o traço usa o gradiente por
 * tema (`--grad1/2/3`): puro sobre ink, rebaixado sobre branco, onde o
 * gradiente de marca não alcança 3:1. Um único desenho serve aos dois temas.
 *
 * Estes são ícones de destaque (64px, com moldura). Os ícones de interface
 * ficam em `icones.tsx`, em traço de 24px e `currentColor`.
 */
import { useId } from "react";

type Props = { s?: number; moldura?: boolean };

/** Moldura + gradiente compartilhados pelos ícones de destaque. */
function Base({
  s = 64,
  moldura = true,
  rotulo,
  children,
}: Props & { rotulo: string; children: (grad: string) => React.ReactNode }) {
  const id = useId();
  const grad = `url(#${id})`;
  return (
    <svg
      width={s} height={s} viewBox="0 0 64 64"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img" aria-label={rotulo}
    >
      <defs>
        <linearGradient id={id} x1="15" y1="52" x2="50" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--grad1)" />
          <stop offset=".55" stopColor="var(--grad2)" />
          <stop offset="1" stopColor="var(--grad3)" />
        </linearGradient>
      </defs>
      {moldura ? (
        <rect
          x="1"
          y="1"
          width="62"
          height="62"
          rx="18"
          fill="var(--via)"
          stroke="var(--borda)"
        />
      ) : null}
      {children(grad)}
    </svg>
  );
}

export const IconeMicrofone = (p: Props) => (
  <Base {...p} rotulo="Microfone">
    {(g) => (
      <g
        fill="none"
        stroke={g}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="25" y="13" width="14" height="26" rx="7" />
        <path d="M18 33v2c0 8 6 14 14 14s14-6 14-14v-2M32 49v7M25 56h14" />
      </g>
    )}
  </Base>
);

export const IconeInsights = (p: Props) => (
  <Base {...p} rotulo="Insights">
    {(g) => (
      <g fill="none" stroke={g} strokeWidth="3.5" strokeLinecap="round">
        <path d="M15 48V35M26 48V25M37 48V31M48 48V16" />
        <path d="m15 26 10-8 10 5 13-12" strokeWidth="3" strokeLinejoin="round" />
      </g>
    )}
  </Base>
);

export const IconeInteligencia = (p: Props) => (
  <Base {...p} rotulo="Inteligência">
    {(g) => (
      <path
        d="M32 10c2 9 5 12 14 14-9 2-12 5-14 14-2-9-5-12-14-14 9-2 12-5 14-14Zm15 26c1 5 3 7 8 8-5 1-7 3-8 8-1-5-3-7-8-8 5-1 7-3 8-8ZM19 38c1 4 3 6 7 7-4 1-6 3-7 7-1-4-3-6-7-7 4-1 6-3 7-7Z"
        fill="none"
        stroke={g}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Base>
);

export const IconeSincronizar = (p: Props) => (
  <Base {...p} rotulo="Sincronização">
    {(g) => (
      <path
        d="M46 24a17 17 0 0 0-28-3l-4 5m0 0h10m-10 0V16M18 40a17 17 0 0 0 28 3l4-5m0 0H40m10 0v10"
        fill="none"
        stroke={g}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Base>
);

/** Ilustração de estado vazio: nenhuma visita registrada ainda. */
export const SemVisitas = ({ l = 220 }: { l?: number }) => {
  const id = useId();
  const g = `url(#${id})`;
  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <svg
      width={l}
      height={(l * 2) / 3}
      viewBox="0 0 360 240"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label="Nenhuma visita registrada"
    >
      <defs>
        <linearGradient id={id} x1="90" y1="200" x2="270" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--grad1)" />
          <stop offset=".52" stopColor="var(--grad2)" />
          <stop offset="1" stopColor="var(--grad3)" />
        </linearGradient>
      </defs>
      <rect
        x="46"
        y="20"
        width="268"
        height="200"
        rx="28"
        fill="var(--superficie)"
        stroke="var(--borda)"
        strokeWidth="2"
      />
      {/* Balão de fala: o relato, dito em voz alta. */}
      <path
        d="M80 62h110a30 30 0 0 1 0 60h-56l-24 24v-24h-30a30 30 0 0 1 0-60Z"
        fill="none"
        stroke={g}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <g fill={g}>
        <rect x="104" y="82" width="8" height="20" rx="4" opacity=".45" />
        <rect x="120" y="72" width="8" height="40" rx="4" opacity=".75" />
        <rect x="136" y="78" width="8" height="28" rx="4" />
        <rect x="152" y="68" width="8" height="48" rx="4" opacity=".75" />
        <rect x="168" y="84" width="8" height="16" rx="4" opacity=".45" />
      </g>
      {/* Os dois destinos do relato: conferido e virado em relatório. */}
      <rect
        x="238"
        y="58"
        width="52"
        height="52"
        rx="16"
        fill="var(--via)"
        stroke="var(--borda)"
        strokeWidth="2"
      />
      <path
        d="m251 84 9 10 18-22"
        fill="none"
        stroke={g}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="238"
        y="122"
        width="52"
        height="52"
        rx="16"
        fill="var(--via)"
        stroke="var(--borda)"
        strokeWidth="2"
      />
      <g stroke={g} strokeWidth="5" strokeLinecap="round">
        <path d="M252 139h24M252 148h24M252 157h15" />
      </g>
      <rect x="80" y="178" width="140" height="10" rx="5" fill="var(--linha)" />
      <rect x="80" y="178" width="86" height="10" rx="5" fill={g} />
    </svg>
  );
};

/** Ilustração de conclusão: o relatório saiu pronto. */
export const VisitaConcluida = ({ l = 200 }: { l?: number }) => {
  const id = useId();
  const g = `url(#${id})`;
  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <svg
      width={l}
      height={(l * 7) / 9}
      viewBox="0 0 360 280"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label="Visita concluída"
    >
      <defs>
        <linearGradient id={id} x1="98" y1="220" x2="263" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--grad1)" />
          <stop offset=".52" stopColor="var(--grad2)" />
          <stop offset="1" stopColor="var(--grad3)" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="136" r="96" fill="var(--acento)" opacity=".08" />
      <circle
        cx="180"
        cy="136"
        r="82"
        fill="var(--superficie)"
        stroke="var(--borda)"
        strokeWidth="2"
      />
      <circle cx="180" cy="136" r="60" fill="var(--via)" stroke={g} strokeWidth="5" />
      <path
        d="m145 136 24 24 48-51"
        fill="none"
        stroke={g}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill={g}>
        <circle cx="73" cy="77" r="5" />
        <circle cx="289" cy="85" r="4" />
        <circle cx="301" cy="183" r="6" />
        <circle cx="67" cy="190" r="4" />
      </g>
      <g stroke={g} strokeWidth="5" strokeLinecap="round">
        <path d="M102 54 92 42M256 55l11-14M273 222l13 8M91 221l-14 9" />
      </g>
      <rect x="110" y="246" width="140" height="10" rx="5" fill="var(--linha)" />
      <rect x="110" y="246" width="104" height="10" rx="5" fill={g} />
    </svg>
  );
};
