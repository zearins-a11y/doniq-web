import { ORPCError } from "@orpc/server";
import { base } from "../core/app";
import { auth } from "../auth";
import { acharOuCriarPorEmail, tokenDoHeader, usuarioPorToken } from "../auth-dispositivo";
import type * as schema from "../database/schema";

type UsuarioRow = typeof schema.users.$inferSelect;

/**
 * Duas portas para a mesma conta:
 *   1. token de dispositivo do export (tabela `sessions`);
 *   2. sessão do Better Auth (login com Google) — mapeada para a conta do app pelo e-mail.
 * Ambas chegam como `Authorization: Bearer …`, então testamos na ordem.
 */
export async function resolverUsuario(headers: Headers): Promise<UsuarioRow | null> {
  const doDispositivo = await usuarioPorToken(tokenDoHeader(headers));
  if (doDispositivo) return doDispositivo;

  const sessao = await auth.api.getSession({ headers });
  if (sessao?.user?.email) {
    return acharOuCriarPorEmail(sessao.user.email, sessao.user.name ?? "");
  }
  return null;
}

/** Auth opcional — `context.usuario` é a conta ou null. */
export const comUsuario = base.use(async ({ context, next }) => {
  return next({ context: { usuario: await resolverUsuario(context.headers) } });
});

/** Procedures protegidas. Mesma mensagem do export. */
export const autenticado = base.use(async ({ context, next }) => {
  const usuario = await resolverUsuario(context.headers);
  if (!usuario) throw new ORPCError("UNAUTHORIZED", { message: "Sessão inválida. Faça login novamente." });
  return next({ context: { usuario } });
});
