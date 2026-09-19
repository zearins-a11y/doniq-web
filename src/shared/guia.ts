/**
 * Guia do doniq — o "Dôni".
 *
 * Um acompanhante opcional que lembra os passos e as dicas da visita. Existe
 * porque vendedor externo usa o app em pé, com pressa, e esquece o que ainda
 * falta dizer. Regras que este módulo carrega:
 *
 * - **Opcional de verdade.** Quem desliga não vê mais nada dele, nem o orbe.
 *   O padrão é ligado só porque a primeira visita é onde ele ajuda mais.
 * - **Nunca lúdico.** O texto é de colega de campo: curto, direto, sem
 *   emoji, sem "oi, eu sou o Dôni!". Ele fala do trabalho, não de si.
 * - **Uma dica por vez.** Lista ordenada; quem quiser vê a próxima.
 * - Texto vive aqui, não na tela — web e app leem a mesma fonte, e o teste
 *   segura o tom (sem emoji, sem exclamação, frase curta).
 */

/** Etapas do fluxo, iguais aos rótulos da tela: Falar → Revisar → Feito. */
export type PassoGuia = "falar" | "revisar" | "feito";

export type DicaGuia = {
  /** Frase curta, imperativa, do jeito que um colega falaria. */
  texto: string;
  /** Rótulo miúdo que diz de onde vem a dica. Aparece acima da frase. */
  fonte: string;
};

/** Nome do acompanhante. Curto porque aparece em rótulo de 10px. */
export const GUIA_NOME = "Dôni";

/** Chave da preferência. Mesma string na web (localStorage) e no app. */
export const GUIA_CHAVE = "doniq_guia";

/** Ligado por padrão: a primeira visita é onde o guia paga o incômodo. */
export const GUIA_PADRAO_LIGADO = true;

/** Dicas de cada etapa. Ordem importa: é a ordem em que aparecem. */
export const DICAS: Record<PassoGuia, DicaGuia[]> = {
  falar: [
    { fonte: "comece por aqui", texto: "Diga a empresa e com quem você falou. O resto eu pesco do meio da frase." },
    { fonte: "o que trava depois", texto: "Fale a objeção com as palavras do cliente, não as suas." },
    { fonte: "sem isso não fecha", texto: "Termine com o combinado: o que você faz e até quando." },
    { fonte: "vale ouro no relatório", texto: "Se saiu número, diga o número. Quantidade, preço, prazo." },
    { fonte: "pode falar torto", texto: "Não precisa organizar a fala. Repetiu, voltou atrás, tudo bem." },
  ],
  revisar: [
    { fonte: "primeiro os marcados", texto: "Os campos com brilho são os que eu não ouvi claro. Confira só eles." },
    { fonte: "campo vazio é resposta", texto: "Se não foi dito na visita, deixe vazio. Não invente pra preencher." },
    { fonte: "a data manda", texto: "Confirme o prazo combinado: é ele que vira compromisso na agenda." },
    { fonte: "antes de mandar", texto: "Leia a mensagem pro cliente em voz alta. Se soar estranha, edite." },
  ],
  feito: [
    { fonte: "enquanto está fresco", texto: "O que ficou em aberto é o roteiro da próxima conversa." },
    { fonte: "dois toques", texto: "Mande o follow-up agora. Depois do almoço já é amanhã." },
    { fonte: "seu gestor", texto: "Ele vê o relatório. A sua gravação não sai do seu aparelho." },
  ],
};

/** Frase única mostrada no orbe fechado, por etapa. */
export const RESUMO_PASSO: Record<PassoGuia, string> = {
  falar: "Conte a visita inteira, sem pressa.",
  revisar: "Confira os campos marcados.",
  feito: "Relatório pronto. Mande o follow-up.",
};

/**
 * Dicas de uma etapa, com a dica do tipo de visita na frente quando existe.
 * O tipo vem do catálogo de verticais (prospecção, retorno, fechamento…) e a
 * frase dele é a mais específica que temos — por isso entra primeiro.
 */
export function dicasDoPasso(passo: PassoGuia, dicaDoTipo?: string): DicaGuia[] {
  const base = DICAS[passo];
  if (passo !== "falar" || !dicaDoTipo?.trim()) return base;
  return [{ fonte: "nesta visita", texto: dicaDoTipo.trim() }, ...base];
}

/* --- arrastar para dispensar ------------------------------------------------
   A regra do gesto mora aqui porque ela é a mesma no site e no aparelho, e no
   aparelho o gesto não dá para verificar em tela (o preview web do React Native
   não recebe gesto sintético). Sendo função pura, o teste cobre a decisão. */

/** Arrasto que já conta como dispensa. Menos que isso o guia volta ao lugar. */
export const ARRASTO_DESLIGA = 72;

/** Abaixo disto o toque ainda é clique: dedo grosso não desliga sem querer. */
export const ARRASTO_MINIMO = 6;

/** Passou da distância para o lado? Então a pessoa quis dispensar. */
export function dispensaPorArrasto(dx: number): boolean {
  return Math.abs(dx) >= ARRASTO_DESLIGA;
}

/**
 * Gesto mais vertical que horizontal é rolagem da tela, não dispensa — o guia
 * devolve o controle para a lista em vez de sair andando junto com o dedo.
 */
export function arrastoEhRolagem(dx: number, dy: number): boolean {
  return Math.abs(dy) > Math.abs(dx);
}

/** Vai apagando enquanto o dedo leva o guia embora: dá para desistir no meio. */
export function opacidadeArrasto(dx: number): number {
  return Math.max(0.25, 1 - Math.abs(dx) / (ARRASTO_DESLIGA * 1.6));
}
