import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Configuração do TanStack Query — ajustada para o padrão de uso do doniq:
 *
 * staleTime: 5 min
 *   Relatórios e dados de CRM mudam pouco durante a sessão. Não precisa refetch
 *   a cada foco de janela.
 *
 * refetchOnWindowFocus: false
 *   Vendedores alternam entre abas o tempo todo. Refetchar a cada volta
 *   degrada UX e aumenta chamadas à API sem necessidade.
 *
 * retry: 1
 *   Falha de rede temporária → uma retry é suficiente. Erro de auth (401/403)
 *   não melhora com retry, mas o retry count baixo significa得快 menos wasted time.
 *
 * gcTime: 10 min
 *   Limpa queries não-usadas depois de 10min inativas — memória controlada.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 0, // mutations não se beneficiam de retry automático
    },
  },
});

interface ProviderProps {
  children: React.ReactNode;
}

// App-level providers — add theme/context providers here, wrapping children.
// QueryClientProvider must stay (all API calls run through TanStack Query).
export function Provider({ children }: ProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
