/**
 * Papéis e permissões da equipe — lógica pura, sem banco.
 *
 * Ficar puro é de propósito: permissão errada é o tipo de bug que ninguém vê na
 * tela e só aparece quando um vendedor lê a carteira do colega. Aqui dá para
 * testar cada combinação sem subir servidor.
 */

export const PAPEIS = ["gestor", "vendedor"] as const;
export type Papel = (typeof PAPEIS)[number];

export const PAPEL_PADRAO: Papel = "vendedor";

export function papelValido(valor: unknown): Papel {
  return PAPEIS.includes(valor as Papel) ? (valor as Papel) : PAPEL_PADRAO;
}

export type Membro = {
  userId: string;
  papel: Papel;
};

export type Equipe = {
  equipeId: string;
  donoUserId: string;
};

/** Só gestor lê o painel. Vendedor vê os próprios relatos pelas telas normais. */
export function podeVerPainel(papel: Papel): boolean {
  return papel === "gestor";
}

/** Só gestor convida. */
export function podeConvidar(papel: Papel): boolean {
  return papel === "gestor";
}

export type Veredito = { ok: true } | { ok: false; motivo: string };

/**
 * Quem pode remover quem.
 *
 * Regras, em ordem: precisa ser gestor; ninguém remove a si mesmo por aqui (para
 * isso existe "sair da equipe", que tem outra regra); o dono da equipe é
 * intocável, senão a equipe fica sem ninguém que possa administrar.
 */
export function podeRemover(
  quemRemove: Membro,
  alvoUserId: string,
  equipe: Equipe,
): Veredito {
  if (quemRemove.papel !== "gestor") {
    return { ok: false, motivo: "Só o gestor pode remover alguém da equipe." };
  }
  if (quemRemove.userId === alvoUserId) {
    return { ok: false, motivo: "Para sair da própria equipe, use sair da equipe." };
  }
  if (alvoUserId === equipe.donoUserId) {
    return { ok: false, motivo: "O dono da equipe não pode ser removido." };
  }
  return { ok: true };
}

/** O dono não sai da própria equipe: teria equipe sem administrador. */
export function podeSair(membro: Membro, equipe: Equipe): Veredito {
  if (membro.userId === equipe.donoUserId) {
    return {
      ok: false,
      motivo: "Você é o dono desta equipe. Transfira a equipe ou apague a conta.",
    };
  }
  return { ok: true };
}

/**
 * De quais contas o gestor pode ler relatos: as da própria equipe, incluindo a
 * dele. Sem membro nenhum, devolve só o próprio id — nunca lista vazia, porque
 * lista vazia em cláusula `IN` costuma virar "todos" por acidente.
 */
export function escopoDeLeitura(solicitante: Membro, membrosDaEquipe: Membro[]): string[] {
  if (solicitante.papel !== "gestor") return [solicitante.userId];
  const ids = new Set<string>([solicitante.userId]);
  for (const m of membrosDaEquipe) ids.add(m.userId);
  return [...ids];
}
