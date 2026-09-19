/**
 * upload-queue.ts — persistência dos áudios antes de qualquer request.
 *
 * Regra: o áudio vai para o IndexedDB no instante em que a gravação termina.
 * O upload é consequência da fila, nunca pré-requisito dela. Se o app fechar,
 * a rede cair ou o vendedor entrar no elevador, o relato continua lá.
 */

const DB_NAME = "relato-queue";
const DB_VERSION = 1;
const STORE_CHUNKS = "chunks";
const STORE_KV = "kv";

export interface Chunk {
  id: string;
  groupId: string;
  index: number;
  total: number;
  blob: Blob;
  mime: string;
  /** Pico de energia do bloco ficou abaixo do limiar — pula a transcrição paga. */
  semSom: boolean;
  status: "pending" | "done" | "failed";
  text: string;
  attempts: number;
  lastError: string;
  createdAt: string;
}

export interface EstadoGrupo {
  groupId: string;
  total: number;
  done: number;
  failed: number;
  complete: boolean;
  texto: string;
  createdAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        const s = db.createObjectStore(STORE_CHUNKS, { keyPath: "id" });
        s.createIndex("byGroup", "groupId");
        s.createIndex("byStatus", "status");
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => T): Promise<unknown> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        let out: T;
        try {
          out = fn(s);
        } catch (e) {
          reject(e);
          return;
        }
        t.oncomplete = () => {
          const r = out as unknown as { result?: unknown };
          resolve(r?.result !== undefined ? r.result : out);
        };
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- fila ---------------- */

/** Grava os pedaços da gravação. Chamado ANTES de qualquer tentativa de upload. */
export async function enqueueRecording(blobs: Blob[], mime: string, semSom: boolean[] = []): Promise<string> {
  const groupId = `grp_${uid()}`;
  const total = blobs.length;
  const createdAt = new Date().toISOString();
  await tx(STORE_CHUNKS, "readwrite", (s) => {
    blobs.forEach((blob, index) => {
      s.put({
        id: `${groupId}_${index}`,
        groupId,
        index,
        total,
        blob,
        mime,
        semSom: semSom[index] ?? false,
        status: "pending", // pending | done | failed
        text: "",
        attempts: 0,
        lastError: "",
        createdAt,
      } satisfies Chunk);
    });
  });
  return groupId;
}

export function allChunks(): Promise<Chunk[]> {
  return tx(STORE_CHUNKS, "readonly", (s) => s.getAll()) as Promise<Chunk[]>;
}

export async function nextPending(): Promise<Chunk | null> {
  const all = await allChunks();
  const elegiveis = all
    .filter((c) => c.status === "pending" || (c.status === "failed" && c.attempts < 6))
    .sort((a, b) =>
      a.createdAt === b.createdAt ? a.index - b.index : a.createdAt < b.createdAt ? -1 : 1,
    );
  return elegiveis[0] || null;
}

export function updateChunk(id: string, patch: Partial<Chunk>): Promise<unknown> {
  return tx(STORE_CHUNKS, "readwrite", (s) => {
    const req = s.get(id);
    req.onsuccess = () => {
      const c = req.result as Chunk | undefined;
      if (c) s.put({ ...c, ...patch });
    };
  });
}

export async function groupState(groupId: string): Promise<EstadoGrupo | null> {
  const all = await allChunks();
  const chunks = all.filter((c) => c.groupId === groupId).sort((a, b) => a.index - b.index);
  if (!chunks.length) return null;
  return {
    groupId,
    total: chunks.length,
    done: chunks.filter((c) => c.status === "done").length,
    failed: chunks.filter((c) => c.status === "failed").length,
    complete: chunks.every((c) => c.status === "done"),
    texto: chunks
      .filter((c) => c.status === "done")
      .map((c) => c.text)
      .join(" ")
      .trim(),
    createdAt: chunks[0].createdAt,
  };
}

export async function listGroups(): Promise<EstadoGrupo[]> {
  const all = await allChunks();
  const ids = [...new Set(all.map((c) => c.groupId))];
  const estados = await Promise.all(ids.map(groupState));
  return estados
    .filter((e): e is EstadoGrupo => Boolean(e))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function removeGroup(groupId: string): Promise<unknown> {
  return tx(STORE_CHUNKS, "readwrite", (s) => {
    const req = s.index("byGroup").getAllKeys(groupId);
    req.onsuccess = () => req.result.forEach((k) => s.delete(k));
  });
}

/** Reabilita um grupo que estourou as tentativas. */
export async function resetGroup(groupId: string): Promise<void> {
  const all = await allChunks();
  await Promise.all(
    all
      .filter((c) => c.groupId === groupId && c.status !== "done")
      .map((c) => updateChunk(c.id, { status: "pending", attempts: 0, lastError: "" })),
  );
}

export async function countPending(): Promise<number> {
  const all = await allChunks();
  return all.filter((c) => c.status !== "done").length;
}

/* ---------------- rascunho da transcrição ---------------- */

export const saveDraft = (texto: string) =>
  tx(STORE_KV, "readwrite", (s) => s.put({ key: "draft", texto, at: Date.now() }));

export const loadDraft = () =>
  (tx(STORE_KV, "readonly", (s) => s.get("draft")) as Promise<{ texto?: string } | undefined>).then(
    (r) => r?.texto || "",
  );

export const clearDraft = () => tx(STORE_KV, "readwrite", (s) => s.delete("draft"));

/* ---------------- wake lock ---------------- */

interface WakeLockSentinel {
  released?: boolean;
  release(): Promise<void>;
}

/** Mantém a tela acesa durante a gravação. Devolve uma função para soltar. */
export async function acquireWakeLock(): Promise<() => void> {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request(tipo: "screen"): Promise<WakeLockSentinel> };
    };
    if (!("wakeLock" in navigator) || !nav.wakeLock) return () => {};
    let lock: WakeLockSentinel | undefined = await nav.wakeLock.request("screen");
    const rearm = async () => {
      if (document.visibilityState === "visible" && lock?.released !== false) {
        try {
          lock = await nav.wakeLock!.request("screen");
        } catch {
          /* usuário pode ter negado */
        }
      }
    };
    document.addEventListener("visibilitychange", rearm);
    return () => {
      document.removeEventListener("visibilitychange", rearm);
      try {
        void lock?.release();
      } catch {
        /* noop */
      }
    };
  } catch {
    return () => {};
  }
}
