import type { ReactElement } from "react";

export const Mic = ({ s = 36 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
  </svg>
);
export const Parar = ({ s = 32 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);
export const Novo = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Agenda = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="16" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const Historico = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const Crm = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 7h6v5H4zM14 12h6v5h-6z" />
    <path d="M7 12v4h7M17 12V8h-7" />
  </svg>
);
export const TemaAuto = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
  </svg>
);
export const TemaClaro = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </svg>
);
export const TemaEscuro = ({ s = 15 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);
export const Equipe = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16.5 6.2a3.2 3.2 0 0 1 0 6M18 19.5c0-2.3-.8-4-2.2-5.1" />
  </svg>
);

/* ── Ícones dos cards de benefício da página de preços (stroke fino, 22px) ─ */
export const IcoInfinito = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.6 6.6c2 2 2 5.3 0 7.3-2 2-5.3 2-7.3 0L8 10.6c-2-2-5.3-2-7.3 0" transform="translate(2.4 1.4) scale(0.82)" />
    <path d="M5.4 6.6c-2 2-2 5.3 0 7.3 2 2 5.3 2 7.3 0l3.3-3.3c2-2 5.3-2 7.3 0" transform="translate(-2.4 -1.4) scale(0.82)" opacity="0" />
    <path d="M12 12c-1.6-2-3.6-3.4-5.2-3.4A3.6 3.6 0 0 0 3.2 12a3.6 3.6 0 0 0 3.6 3.6c1.6 0 3.6-1.4 5.2-3.6Zm0 0c1.6 2 3.6 3.4 5.2 3.4a3.6 3.6 0 0 0 3.6-3.6 3.6 3.6 0 0 0-3.6-3.6c-1.6 0-3.6 1.4-5.2 3.6Z" />
  </svg>
);
export const IcoDocumento = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);
export const IcoEscudo = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5.5v5.2c0 5 3.4 9.3 8 10.8 4.6-1.5 8-5.8 8-10.8V5.5z" />
    <path d="m8.5 11.5 2.5 2.5 4.5-5" />
  </svg>
);
export const IcoPasta = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5a2 2 0 0 1 2-2h3l2 2.5h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="m9 13 2 2 4-4.5" />
  </svg>
);
export const IcoSinalOff = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5a9.5 9.5 0 0 1 3.4-3.4M12 5a11 11 0 0 1 9 5" />
    <path d="M8.5 15.5a5 5 0 0 1 5-1.6" />
    <path d="m3 3 18 18" />
    <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
export const IcoDispositivos = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="13" height="9" rx="1.5" />
    <path d="M6 17h5M8.5 13v4" />
    <rect x="16.5" y="9" width="5" height="11" rx="1.2" />
    <path d="M18.6 17.5h.8" />
  </svg>
);
export const IcoDownload = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
export const IcoEquipeGrande = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16.5 6.2a3.2 3.2 0 0 1 0 6M18 19.5c0-2.3-.8-4-2.2-5.1" />
  </svg>
);
export const IcoCalendario = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="m9.5 15.5 2 2 3.5-4" />
  </svg>
);
export const IcoConector = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3v5M15 3v5" />
    <path d="M6 8h12v4a6 6 0 0 1-6 6 6 6 0 0 1-6-6z" />
    <path d="M12 18v3" />
  </svg>
);
export const IcoMapear = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 4 3 6.5v11L9 15l6 2.5 6-2.5v-11L15 6.5z" />
    <path d="M9 4v11M15 6.5V17.5" />
  </svg>
);
export const IcoSuporte = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="m5.5 5.5 4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" />
  </svg>
);
export const IcoSincronia = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7.5A8.5 8.5 0 0 0 5.6 4.9L4 6.5" />
    <path d="M4 2.5v4h4" />
    <path d="M4 16.5a8.5 8.5 0 0 0 14.4 2.6L20 17.5" />
    <path d="M20 21.5v-4h-4" />
  </svg>
);
export const IcoCheck = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);
export const IcoMenos = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 12h13" />
  </svg>
);

/** Mapa nome → componente, usado pelos cards de benefício da página de preços. */
export const ICONES_PRECO: Record<string, (p: { s?: number }) => ReactElement> = {
  infinito: IcoInfinito,
  documento: IcoDocumento,
  escudo: IcoEscudo,
  pasta: IcoPasta,
  "sinal-off": IcoSinalOff,
  dispositivos: IcoDispositivos,
  download: IcoDownload,
  equipe: IcoEquipeGrande,
  calendario: IcoCalendario,
  conector: IcoConector,
  mapear: IcoMapear,
  suporte: IcoSuporte,
  sincronia: IcoSincronia,
};
