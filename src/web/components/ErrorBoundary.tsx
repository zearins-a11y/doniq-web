/**
 * ErrorBoundary global para o app web.
 *
 * Captura erros de renderização React e mostra feedback amigável
 * sem travar a tela. Erros de JS assíncronos (promises rejeitadas,
 * eventos) são capturados pelo global handler no main.tsx.
 */
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Fallback customizado por rota */
  fallback?: (erro: Error, reset: () => void) => ReactNode;
  /** Callback para reportar ao observability (Sentry) */
  onError?: (erro: Error, info: React.ErrorInfo) => void;
}

interface State {
  erro: Error | null;
  info: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { erro: null, info: null };
  }

  static getDerivedStateFromError(erro: Error): State {
    return { erro, info: null };
  }

  override componentDidCatch(erro: Error, info: React.ErrorInfo) {
    this.setState({ erro, info });
    this.props.onError?.(erro, info);
  }

  reset = () => this.setState({ erro: null, info: null });

  override render() {
    if (this.state.erro) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.erro, this.reset);
      }
      return <ErroPadrao erro={this.state.erro} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function ErroPadrao({ erro, reset }: { erro: Error; reset: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 16,
        padding: 24,
        textAlign: "center",
        color: "var(--tinta2, currentColor)",
      }}
    >
      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx={12} cy={12} r={10} />
        <path d="M12 8v4m0 4h.01" />
      </svg>
      <div>
        <p style={{ fontWeight: 600, color: "var(--titulo-fallback, currentColor)", margin: "0 0 8px" }}>
          Algo deu errado
        </p>
        <p style={{ margin: 0, fontSize: 14, maxWidth: 360 }}>
          {erro.message || "Erro desconhecido"}
        </p>
      </div>
      <button
        className="btn2 ok"
        onClick={reset}
        style={{ marginTop: 8 }}
      >
        Tentar de novo
      </button>
    </div>
  );
}
