import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "node:path";
import { db, client } from "./client";
import { SEED_DATA } from "./seed-data";

export async function initDatabase() {
  // 1. Executa migrações estruturais do Drizzle (17 tabelas)
  try {
    const migrationsFolder = resolve(import.meta.dir, "../../../drizzle");
    await migrate(db, { migrationsFolder });
  } catch (err) {
    console.error("⚠️ [DB] Aviso ao aplicar migrações Drizzle:", err);
  }

  // 2. Se a tabela users estiver vazia, aplica os dados iniciais de seed para garantir paridade
  try {
    const result = await client.execute("SELECT COUNT(*) as c FROM users");
    const count = Number(result.rows[0]?.c ?? 0);
    if (count === 0) {
      for (const u of SEED_DATA.users) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO users (user_id, email, nome, produto, vertical, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
          args: [u.user_id, u.email, u.nome, u.produto, u.vertical, u.criado_em],
        });
      }

      for (const u of SEED_DATA.user) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO user (id, name, email, email_verified, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [u.id, u.name, u.email, u.email_verified, u.image, u.created_at, u.updated_at],
        });
      }

      for (const a of SEED_DATA.account) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            a.id,
            a.account_id,
            a.provider_id,
            a.user_id,
            a.access_token,
            a.refresh_token,
            a.id_token,
            a.access_token_expires_at,
            a.refresh_token_expires_at,
            a.scope,
            a.password,
            a.created_at,
            a.updated_at,
          ],
        });
      }

      for (const c of SEED_DATA.compromissos) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO compromissos (compromisso_id, user_id, empresa, contato, telefone, objetivo, endereco, data_iso, hora, minutos, status, relato_id, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            c.compromisso_id,
            c.user_id,
            c.empresa,
            c.contato,
            c.telefone,
            c.objetivo,
            c.endereco,
            c.data_iso,
            c.hora,
            c.minutos,
            c.status,
            c.relato_id,
            c.criado_em,
            c.atualizado_em,
          ],
        });
      }

      for (const l of SEED_DATA.lista_espera as readonly { id: string; email: string; segmento: string; criado_em: string }[]) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO lista_espera (id, email, segmento, criado_em) VALUES (?, ?, ?, ?)",
          args: [l.id, l.email, l.segmento, l.criado_em],
        });
      }
    }
  } catch (err) {
    console.error("⚠️ [DB] Aviso ao verificar/popular seed inicial:", err);
  }
}
