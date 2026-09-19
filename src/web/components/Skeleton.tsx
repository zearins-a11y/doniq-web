/**
 * Skeleton — placeholder animado enquanto conteúdo carrega.
 *
 * Evita CLS e a percepção de "travou". Duração: 1.5s de ciclo.
 * Use `delay` para adiar o aparecimento (evita piscar em dados rápidos).
 */
import "./Skeleton.css";

interface Props {
  /** Altura em px ou CSS units. */
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
  className?: string;
  /** ms antes de aparecer — evita piscar em dados < 200ms. */
  delay?: number;
}

/**
 * Barra de skeleton horizontal genérica.
 * Para linhas de lista: height=14px, width=100%, gap=8px entre items.
 */
export function Skeleton({ height = 14, width = "100%", borderRadius = "4px", className = "", delay = 0 }: Props) {
  const style = {
    height: typeof height === "number" ? `${height}px` : height,
    width: typeof width === "number" ? `${width}px` : width,
    borderRadius,
    animationDelay: delay ? `${delay}ms` : undefined,
  };
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** Linha de skeleton que imita ItemRelato (histórico). */
export function SkeletonRelato() {
  return (
    <div className="skeleton-relato">
      <div className="skeleton-relato__left">
        <Skeleton height={12} width="60%" />
        <Skeleton height={10} width="40%" delay={100} />
      </div>
      <div className="skeleton-relato__right">
        <Skeleton height={20} width={64} borderRadius="12px" delay={200} />
      </div>
    </div>
  );
}

/** Card de skeleton para o checklist / campos da ficha. */
export function SkeletonCampo() {
  return (
    <div className="skeleton-campo">
      <Skeleton height={10} width="30%" />
      <Skeleton height={32} />
    </div>
  );
}

/** Skeleton da grade de agenda: 7 dias × 5 semanas. */
export function SkeletonAgenda() {
  const dias = Array.from({ length: 35 });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        padding: "8px 0",
      }}
    >
      {dias.map((_, i) => (
        <Skeleton key={i} height={40} delay={i * 20} />
      ))}
    </div>
  );
}
