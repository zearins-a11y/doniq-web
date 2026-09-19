type EtapaLogout = () => unknown | Promise<unknown>;

const LIMITE_REVOGACAO_MS = 5_000;

export interface EtapasLogout {
  revogarSessaoAplicativo: EtapaLogout;
  revogarSessaoBetterAuth: EtapaLogout;
  limparSessaoGerenciada: EtapaLogout;
  limparSessaoLocal: EtapaLogout;
}

export interface ResultadoLogout {
  sessaoAplicativoRevogada: boolean;
  sessaoBetterAuthRevogada: boolean;
}

export function podeConcluirLogoutNaInterface(
  resultado: ResultadoLogout,
  usaCookieBetterAuth: boolean,
): boolean {
  return !usaCookieBetterAuth || resultado.sessaoBetterAuthRevogada;
}

async function revogar(etapa: EtapaLogout, limiteMs: number): Promise<boolean> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    const resultado = await Promise.race([
      Promise.resolve().then(etapa),
      new Promise<never>((_, rejeitar) => {
        temporizador = setTimeout(() => rejeitar(new Error("Tempo de revogação excedido.")), limiteMs);
      }),
    ]);
    if (resultado && typeof resultado === "object" && "error" in resultado) {
      return !(resultado as { error?: unknown }).error;
    }
    return true;
  } catch {
    return false;
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

/**
 * Revoga as duas formas de autenticação antes de limpar o estado local.
 * Falha de uma revogação não impede as demais etapas de limpeza.
 */
export async function encerrarTodasAsSessoes(
  etapas: EtapasLogout,
  limiteRevogacaoMs = LIMITE_REVOGACAO_MS,
): Promise<ResultadoLogout> {
  let sessaoAplicativoRevogada = false;
  let sessaoBetterAuthRevogada = false;
  try {
    sessaoAplicativoRevogada = await revogar(
      etapas.revogarSessaoAplicativo,
      limiteRevogacaoMs,
    );
    sessaoBetterAuthRevogada = await revogar(
      etapas.revogarSessaoBetterAuth,
      limiteRevogacaoMs,
    );
  } finally {
    await Promise.allSettled([
      Promise.resolve().then(etapas.limparSessaoGerenciada),
      Promise.resolve().then(etapas.limparSessaoLocal),
    ]);
  }
  return { sessaoAplicativoRevogada, sessaoBetterAuthRevogada };
}
