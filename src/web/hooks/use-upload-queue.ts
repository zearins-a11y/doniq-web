/**
 * use-upload-queue.ts — consome a fila de áudios com retry e backoff.
 *
 * O hook nunca perde áudio: ele só apaga um grupo do IndexedDB depois que
 * todos os pedaços viraram texto e o texto foi entregue ao chamador.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import {
  type EstadoGrupo,
  countPending,
  enqueueRecording,
  groupState,
  listGroups,
  nextPending,
  removeGroup,
  resetGroup,
  updateChunk,
} from "../lib/upload-queue";
import {
  erroUploadSemConexao,
  statusDepoisDaFalha,
} from "../lib/upload-retry";

const espera = (n: number) => Math.min(30000, 1000 * 2 ** n); // 1s, 2s, 4s… teto 30s
const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface UseUploadQueue {
  pending: number;
  groups: EstadoGrupo[];
  working: boolean;
  online: boolean;
  enqueue: (blobs: Blob[] | Blob, mime: string, semSom?: boolean[]) => Promise<string | null>;
  tentarDeNovo: (groupId: string) => Promise<void>;
  descartar: (groupId: string) => Promise<void>;
  drenar: () => Promise<void>;
}

export default function useUploadQueue({
  onGroupComplete,
}: {
  onGroupComplete?: (texto: string, estado: EstadoGrupo) => void;
}): UseUploadQueue {
  const [pending, setPending] = useState(0);
  const [groups, setGroups] = useState<EstadoGrupo[]>([]);
  const [working, setWorking] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const rodando = useRef(false);
  const completeRef = useRef(onGroupComplete);
  completeRef.current = onGroupComplete;

  const refresh = useCallback(async () => {
    setPending(await countPending());
    setGroups(await listGroups());
  }, []);

  const drenar = useCallback(async () => {
    if (rodando.current) return;
    rodando.current = true;
    setWorking(true);
    try {
      while (navigator.onLine) {
        const chunk = await nextPending();
        if (!chunk) break;

        // Bloco sem energia de fala detectada na gravação: mesmo resultado de
        // um SEM_FALA do servidor, sem gastar a chamada (que é paga por
        // minuto e, em silêncio, é onde o modelo mais alucina).
        if (chunk.semSom) {
          await updateChunk(chunk.id, { status: "done", text: "", lastError: "" });
          const st = await groupState(chunk.groupId);
          if (st?.complete) {
            completeRef.current?.(st.texto, st);
            await removeGroup(chunk.groupId);
          }
          await refresh();
          continue;
        }

        const ext = (chunk.mime || "").includes("webm") ? "webm" : "mp4";
        const form = new FormData();
        form.append("file", chunk.blob, `relato-${chunk.index + 1}.${ext}`);

        try {
          const data = await api.transcrever(form);
          setOnline(true);
          await updateChunk(chunk.id, {
            status: "done",
            text: (data?.transcricao || "").trim(),
            lastError: "",
          });
        } catch (err) {
          const semConexao = erroUploadSemConexao(err);
          if (semConexao) setOnline(false);
          const tentativas = semConexao ? chunk.attempts : chunk.attempts + 1;
          const status = statusDepoisDaFalha(err, tentativas);
          await updateChunk(chunk.id, {
            status,
            attempts: tentativas,
            lastError: (err as Error)?.message || "falha de rede",
          });
          await refresh();
          if (semConexao || status === "failed") break;
          await dorme(espera(tentativas));
          continue;
        }

        /* grupo fechado? entrega o texto e limpa */
        const st = await groupState(chunk.groupId);
        if (st?.complete) {
          completeRef.current?.(st.texto, st);
          await removeGroup(chunk.groupId);
        }
        await refresh();
      }
    } finally {
      rodando.current = false;
      setWorking(false);
      await refresh();
    }
  }, [refresh]);

  /** Chamado pelo Recorder: grava primeiro, envia depois. */
  const enqueue = useCallback(
    async (blobs: Blob[] | Blob, mime: string, semSom: boolean[] = []) => {
      const lista = Array.isArray(blobs) ? blobs : [blobs];
      const uteis = lista.filter((b) => b && b.size > 0);
      const semSomUteis = lista.map((_, i) => semSom[i] ?? false).filter((_, i) => lista[i] && lista[i].size > 0);
      if (!uteis.length) return null;
      const groupId = await enqueueRecording(uteis, mime, semSomUteis);
      await refresh();
      void drenar();
      return groupId;
    },
    [drenar, refresh],
  );

  const tentarDeNovo = useCallback(
    async (groupId: string) => {
      await resetGroup(groupId);
      await refresh();
      void drenar();
    },
    [drenar, refresh],
  );

  const descartar = useCallback(
    async (groupId: string) => {
      await removeGroup(groupId);
      await refresh();
    },
    [refresh],
  );

  /* dispara quando a rede volta, quando o app ganha foco, e a cada 30s */
  useEffect(() => {
    void drenar();
    const aoVoltar = () => {
      setOnline(true);
      void drenar();
    };
    const aoCair = () => setOnline(false);
    const aoFocar = () => {
      if (navigator.onLine) void drenar();
    };

    window.addEventListener("online", aoVoltar);
    window.addEventListener("offline", aoCair);
    window.addEventListener("focus", aoFocar);
    document.addEventListener("visibilitychange", aoFocar);
    const t = setInterval(aoFocar, 30000);

    return () => {
      window.removeEventListener("online", aoVoltar);
      window.removeEventListener("offline", aoCair);
      window.removeEventListener("focus", aoFocar);
      document.removeEventListener("visibilitychange", aoFocar);
      clearInterval(t);
    };
  }, [drenar, refresh]);

  /* avisa antes de fechar a aba com áudio ainda na fila */
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (pending > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [pending]);

  return { pending, groups, working, online, enqueue, tentarDeNovo, descartar, drenar };
}
