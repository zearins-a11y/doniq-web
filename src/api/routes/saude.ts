import { sql } from "drizzle-orm";
import { base } from "../core/app";
import { db } from "../database";

export const saude = base.handler(async () => {
  let banco = "ok";
  try {
    await db.run(sql`select 1`);
  } catch {
    banco = "indisponível";
  }
  return { api: "ok", banco };
});
