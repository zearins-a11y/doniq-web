/**
 * Portabilidade (LGPD art. 18, V): monta o pacote de dados do titular.
 *
 * Função pura de propósito: recebe o que já saiu do banco e devolve o JSON que
 * o vendedor baixa. Fica separada da rota porque o que não pode vazar aqui —
 * token de sessão, credencial de CRM em claro — precisa de teste, e teste de
 * rota exigiria banco.
 */

import type { Usuario } from "../auth-dispositivo";

/** Campos de integração que podem sair. O token cifrado nunca entra nesta lista. */
export interface IntegracaoExportada {
  provedor: string;
  nome: string;
  token_mascarado: string;
  mapa_campos: Record<string, string>;
  funil_id: string;
  etapa_id: string;
  ativa: boolean;
  atualizado_em: string;
}

export const VERSAO_EXPORTACAO = "1";

/** Chaves que jamais podem aparecer no arquivo entregue ao titular. */
export const CHAVES_PROIBIDAS = ["credenciais", "token", "senha", "password", "authorization"];

export interface Exportacao {
  versao: string;
  gerado_em: string;
  aviso: string;
  usuario: Usuario;
  totais: { relatos: number; integracoes: number };
  relatos: Record<string, unknown>[];
  integracoes: IntegracaoExportada[];
}

/**
 * Varre o objeto e apaga qualquer chave proibida que tenha entrado por descuido
 * — inclusive de um campo novo acrescentado no futuro sem ninguém lembrar daqui.
 * O nome mascarado (`token_mascarado`) passa: não é segredo, são quatro dígitos.
 */
export function limparSegredos<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map((v) => limparSegredos(v)) as unknown as T;
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
      if (CHAVES_PROIBIDAS.includes(chave.toLowerCase())) continue;
      saida[chave] = limparSegredos(v);
    }
    return saida as unknown as T;
  }
  return valor;
}

export function montarExportacao(
  usuario: Usuario,
  relatos: Record<string, unknown>[],
  integracoes: IntegracaoExportada[],
  agora: string,
): Exportacao {
  return {
    versao: VERSAO_EXPORTACAO,
    gerado_em: agora,
    aviso:
      "Este arquivo contém dados pessoais de terceiros (contatos das visitas). " +
      "Guarde-o com o mesmo cuidado que você daria ao seu caderno de visitas.",
    usuario: limparSegredos(usuario),
    totais: { relatos: relatos.length, integracoes: integracoes.length },
    relatos: limparSegredos(relatos),
    integracoes: limparSegredos(integracoes),
  };
}

/** Nome do arquivo baixado. Data no nome porque o titular costuma baixar mais de uma vez. */
export function nomeArquivo(usuario: Pick<Usuario, "email">, agora: string): string {
  const dia = agora.slice(0, 10);
  const apelido = usuario.email.split("@")[0]?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "conta";
  return `doniq-meus-dados-${apelido}-${dia}.json`;
}
