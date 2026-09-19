import { forwardRef, type ButtonHTMLAttributes } from "react";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * children renderiza dentro do botão
   */
  children: React.ReactNode;
  /**
   * Tamanho do botão: small | medium | large
   */
  tamanho?: "small" | "medium" | "large";
  /**
   * Se true, botão fica desabilitado e mostra loading
   */
  carregando?: boolean;
}

/**
 * Botão com gradiente — estilo popular em UX moderna (Linear, Vercel).
 * Usa tokens de gradiente do design system (GRADIENTE_CLARO).
 */
export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, tamanho = "medium", carregando, disabled, className = "", style, ...props }, ref) => {
    const sizeStyles = {
      small: { padding: "8px 16px", fontSize: "13px" },
      medium: { padding: "12px 24px", fontSize: "15px" },
      large: { padding: "16px 32px", fontSize: "17px" },
    };

    return (
      <button
        ref={ref}
        disabled={disabled || carregando}
        className={className}
        style={{
          ...style,
          ...sizeStyles[tamanho],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          border: "none",
          borderRadius: "10px",
          fontWeight: 600,
          color: "white",
          background: "linear-gradient(135deg, var(--grad-1, #6D3BEB) 0%, var(--grad-2, #0969C9) 52%, var(--grad-3, #0E7490) 100%)",
          cursor: disabled || carregando ? "not-allowed" : "pointer",
          opacity: disabled || carregando ? 0.6 : 1,
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          boxShadow: "0 2px 8px rgba(109, 59, 235, 0.25)",
        }}
        {...props}
      >
        {carregando ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Carregando...
          </span>
        ) : (
          children
        )}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(109, 59, 235, 0.35);
          }
          button:active:not(:disabled) {
            transform: translateY(0);
          }
        `}</style>
      </button>
    );
  }
);

GradientButton.displayName = "GradientButton";
