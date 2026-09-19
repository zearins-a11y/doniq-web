/**
 * Freio de envio para rotas públicas.
 *
 * Existe por um motivo específico: o formulário do encarregado de dados é aberto
 * — sem login, como manda a LGPD, porque o titular pode não ter conta. Formulário
 * aberto que dispara e-mail é, para quem procura, um relay de graça: um robô
 * manda mil mensagens no meu remetente e o domínio vai para a lista de spam.
 * Um dia depois, o convite de equipe para de chegar. O freio protege a entrega
 * do convite, não só a caixa do encarregado.
 *
 * Memória do processo, de propósito: um contador em banco custaria escrita por
 * requisição e ainda assim não seguraria ataque distribuído. Aqui o objetivo é
 * conter o acidente e o abuso caseiro; abuso sério se resolve na borda, na
 * hospedagem. Reiniciar o servidor zera o contador — aceitável para o que isto
 * defende, e dito aqui para ninguém confundir com garantia.
 */

/** Janela de contagem. */
export const JANELA_MS = 60 * 60 * 1000;

/** Quantos envios a mesma chave consegue na janela. */
export const LIMITE_POR_JANELA = 3;

/** Teto de chaves guardadas: mapa sem teto é vazamento de memória disfarçado. */
export const MAX_CHAVES = 5000;

type Marca = { contagem: number; expiraEm: number };

const marcas = new Map<string, Marca>();

export type Veredito = {
  permitido: boolean;
  /** Quantos envios ainda cabem nesta janela. */
  restantes: number;
  /** Minutos até liberar. Zero quando permitido. */
  minutos: number;
};

function limparVencidas(agora: number): void {
  for (const [chave, m] of marcas) {
    if (m.expiraEm <= agora) marcas.delete(chave);
  }
}

/**
 * Contabiliza uma tentativa e diz se ela passa.
 *
 * `agora` entra por parâmetro para o teste mandar no relógio em vez de dormir
 * uma hora — mesma regra dos indicadores.
 */
export function registrarTentativa(chave: string, agora: number = Date.now()): Veredito {
  const k = String(chave || "").trim().toLowerCase() || "sem-chave";
  limparVencidas(agora);

  // Cheio: derrubar o mapa inteiro é melhor que negar serviço a quem chegou agora.
  if (marcas.size >= MAX_CHAVES && !marcas.has(k)) marcas.clear();

  const atual = marcas.get(k);
  if (!atual || atual.expiraEm <= agora) {
    marcas.set(k, { contagem: 1, expiraEm: agora + JANELA_MS });
    return { permitido: true, restantes: LIMITE_POR_JANELA - 1, minutos: 0 };
  }

  if (atual.contagem >= LIMITE_POR_JANELA) {
    return {
      permitido: false,
      restantes: 0,
      minutos: Math.max(1, Math.ceil((atual.expiraEm - agora) / 60000)),
    };
  }

  atual.contagem++;
  return { permitido: true, restantes: LIMITE_POR_JANELA - atual.contagem, minutos: 0 };
}

/** Só para os testes e para o painel de saúde: nunca chamar em rota. */
export function zerarLimites(): void {
  marcas.clear();
}

export function chavesEmUso(): number {
  return marcas.size;
}
