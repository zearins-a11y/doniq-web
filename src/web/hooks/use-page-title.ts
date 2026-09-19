import { useEffect } from "react";

const TITULO_BASE = "DONIQ";

/**
 * Hook para definir o título da página.
 *
 * Uso:
 *   usePageTitle("Nova Visita");
 *   // → document.title = "Nova Visita · DONIQ"
 *
 *   usePageTitle("Login", { prependBase: false });
 *   // → document.title = "Login"
 */
export function usePageTitle(
  titulo: string,
  options?: { prependBase?: boolean },
) {
  const { prependBase = true } = options ?? {};

  useEffect(() => {
    const tituloCompleto = prependBase
      ? `${titulo} · ${TITULO_BASE}`
      : titulo;

    document.title = tituloCompleto;

    return () => {
      // Opcional: restaurar título anterior ao desmontar
      // document.title = TITULO_BASE;
    };
  }, [titulo, prependBase]);
}
