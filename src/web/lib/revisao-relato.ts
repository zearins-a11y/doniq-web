import type { MudancasRelato, Relato } from "./api";

export const CHAVES_CAMPO_REVISAVEL = [
  "empresa",
  "contato",
  "proxima_acao",
  "resumo",
  "objecao",
] as const;

export type ChaveCampoRevisavel = (typeof CHAVES_CAMPO_REVISAVEL)[number];

export function aplicarCampoRevisado(
  relato: Relato,
  chave: ChaveCampoRevisavel,
  valor: string,
): Relato {
  return {
    ...relato,
    [chave]: valor,
  };
}

export function criarMudancasRevisao(relato: Relato): MudancasRelato {
  return Object.fromEntries(
    CHAVES_CAMPO_REVISAVEL.map((chave) => [chave, relato[chave]]),
  ) as MudancasRelato;
}

export function aplicarConfirmacaoRevisaoLocal(relato: Relato): Relato {
  const mudancas = criarMudancasRevisao(relato);
  const confianca = { ...relato.confianca };
  const evidencia = { ...relato.evidencia };

  for (const chave of CHAVES_CAMPO_REVISAVEL) {
    confianca[chave] = relato[chave] ? "alta" : "vazio";
    evidencia[chave] = relato[chave] ? "corrigido pelo vendedor" : "";
  }

  return {
    ...relato,
    ...mudancas,
    confianca,
    evidencia,
    campos_a_revisar: [],
  };
}
