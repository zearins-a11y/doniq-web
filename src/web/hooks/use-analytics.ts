import { useCallback, useEffect, useRef } from "react";
import { caminhoSeguroAnalytics } from "../lib/analytics";

type EventoConversao =
  | "cta_landing_clicado"
  | "formulario_enviado"
  | "login_iniciado"
  | "login_completo"
  | "pagina_visitada";

interface PropsEvento {
  evento: EventoConversao;
  propriedades?: Record<string, string | number | boolean>;
}

/**
 * Hook para trackear eventos de conversão.
 *
 * Uso:
 *   const analytics = useAnalytics();
 *
 *   // Evento simples
 *   analytics.track({ evento: "cta_landing_clicado" });
 *
 *   // Com propriedades
 *   analytics.track({ evento: "formulario_enviado", propriedades: { perfil: "autonomo" } });
 */
export function useAnalytics() {
  const jaEnviou = useRef<Set<string>>(new Set());

  const track = useCallback(({ evento, propriedades = {} }: PropsEvento) => {
    // Evitar duplicatas rápidas (debounce de 1 segundo por evento)
    const chave = `${evento}-${JSON.stringify(propriedades)}`;
    if (jaEnviou.current.has(chave)) return;
    jaEnviou.current.add(chave);
    setTimeout(() => jaEnviou.current.delete(chave), 1000);

    // Se window.stonks existe (OneDollarStats), usa ele
    if (typeof window !== "undefined" && window.stonks) {
      const caminho = caminhoSeguroAnalytics(window.location.pathname);
      window.stonks.event(evento, caminho ?? undefined, propriedades);
    }

    // Log em dev para debug
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[Analytics]", evento, propriedades);
    }
  }, []);

  return { track };
}

/**
 * Hook para trackear visualizações de página (conversão "view").
 *自动 envio de evento de view quando a página monta.
 */
export function usePageView() {
  const { track } = useAnalytics();

  useEffect(() => {
    const caminho = typeof window !== "undefined" ? window.location.pathname : "/";
    track({ evento: "pagina_visitada", propriedades: { url: caminho } });
  }, [track]);
}
