/**
 * Gravação de áudio. Três coisas que só aparecem em campo:
 *  - iOS não grava webm: precisa cair para mp4
 *  - áudio longo estoura o limite da transcrição: quebra em blocos de 60s
 *  - a tela apaga e o iOS suspende o MediaRecorder: wake lock
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { acquireWakeLock } from "../lib/upload-queue";

const BLOCO_SEGUNDOS = 60;

/**
 * RMS abaixo disso é tratado como silêncio digital (chão de ruído do
 * microfone, sem fala). Limiar deliberadamente baixo: cortar um bloco à toa
 * perde relato de verdade, e isso é bem pior do que deixar passar um pedaço
 * de silêncio pro servidor. Não é VAD de verdade — é só um filtro grosseiro
 * pro caso óbvio (mic mudo, bolso, teste sem falar nada), que é também o
 * caso em que o modelo de transcrição mais alucina.
 */
const LIMIAR_RMS_SILENCIO = 0.01;

export function blocoSemSom(picoRms: number, monitorAtivo: boolean): boolean {
  return monitorAtivo && picoRms < LIMIAR_RMS_SILENCIO;
}

function melhorMime(): string {
  const opcoes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  for (const m of opcoes) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "";
}

export interface UseRecorder {
  gravando: boolean;
  pausado: boolean;
  segundos: number;
  nivelVoz: number;
  erro: string;
  iniciar: () => Promise<void>;
  pausar: () => void;
  retomar: () => void;
  parar: () => void;
  alternar: () => void;
}

export default function useRecorder({
  onPronto,
}: {
  /** `semSom[i]` diz se o bloco `blobs[i]` não passou do limiar de RMS em nenhum momento. */
  onPronto: (blobs: Blob[], mime: string, semSom: boolean[]) => void;
}): UseRecorder {
  const [gravando, setGravando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [nivelVoz, setNivelVoz] = useState(0);
  const [erro, setErro] = useState("");

  const stream = useRef<MediaStream | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const blocos = useRef<Blob[]>([]); // blocos fechados
  const semSomBlocos = useRef<boolean[]>([]); // paralelo a blocos.current
  const buffer = useRef<Blob[]>([]); // dataavailable do gravador atual
  const mime = useRef("audio/webm");
  const parando = useRef(false);
  const pausadoRef = useRef(false);
  const cron = useRef<ReturnType<typeof setInterval> | null>(null);
  const rodizio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soltarLock = useRef<(() => void) | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const monitor = useRef<ReturnType<typeof setInterval> | null>(null);
  const picoRmsBloco = useRef(0);
  const nivelSuavizado = useRef(0);

  const limpar = useCallback(() => {
    if (cron.current) clearInterval(cron.current);
    if (rodizio.current) clearTimeout(rodizio.current);
    if (monitor.current) clearInterval(monitor.current);
    cron.current = null;
    rodizio.current = null;
    monitor.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    analyser.current = null;
    nivelSuavizado.current = 0;
    pausadoRef.current = false;
    setNivelVoz(0);
    setPausado(false);
    soltarLock.current?.();
    soltarLock.current = null;
  }, []);

  useEffect(() => () => limpar(), [limpar]);

  const iniciarCronometro = useCallback(() => {
    if (cron.current) clearInterval(cron.current);
    cron.current = setInterval(() => setSegundos((s) => s + 1), 1000);
  }, []);

  const agendarRodizio = useCallback((gravador: MediaRecorder) => {
    if (rodizio.current) clearTimeout(rodizio.current);
    rodizio.current = setTimeout(
      () => {
        if (
          !parando.current &&
          !pausadoRef.current &&
          mr.current === gravador &&
          gravador.state === "recording"
        ) {
          gravador.stop();
        }
      },
      BLOCO_SEGUNDOS * 1000,
    );
  }, []);

  const criarGravador = useCallback(() => {
    const g = new MediaRecorder(
      stream.current!,
      mime.current ? { mimeType: mime.current } : undefined,
    );
    buffer.current = [];
    picoRmsBloco.current = 0;

    g.ondataavailable = (e) => {
      if (e.data?.size > 0) buffer.current.push(e.data);
    };

    g.onstop = () => {
      const b = new Blob(buffer.current, { type: mime.current });
      if (b.size > 0) {
        blocos.current.push(b);
        semSomBlocos.current.push(blocoSemSom(picoRmsBloco.current, monitor.current !== null));
      }

      if (parando.current) {
        const todos = blocos.current;
        const semSom = semSomBlocos.current;
        limpar();
        setGravando(false);
        if (todos.length) onPronto(todos, mime.current, semSom);
      } else {
        criarGravador(); // rodízio: abre o próximo bloco
      }
    };

    g.start();
    mr.current = g;
    agendarRodizio(g);
  }, [agendarRodizio, limpar, onPronto]);

  const iniciar = useCallback(async () => {
    setErro("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mime.current = melhorMime() || "audio/webm";
      blocos.current = [];
      semSomBlocos.current = [];
      parando.current = false;
      pausadoRef.current = false;
      nivelSuavizado.current = 0;
      setNivelVoz(0);
      setSegundos(0);
      setPausado(false);
      setGravando(true);
      soltarLock.current = await acquireWakeLock();
      iniciarCronometro();

      // Monitor de energia: roda em paralelo à gravação só pra decidir se o
      // bloco teve fala; não altera o áudio gravado nem toca em alto-falante.
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          audioCtx.current = new Ctx();
          // Política de autoplay: um AudioContext novo nasce "suspended" em
          // alguns navegadores mesmo dentro de um gesto do usuário. Sem
          // resume(), o analyser não processa nada e todo áudio (inclusive
          // fala real) mediria RMS ~0 — silêncio falso-positivo em 100% dos
          // casos, o oposto do que esse filtro deveria fazer.
          await audioCtx.current.resume();
          const source = audioCtx.current.createMediaStreamSource(stream.current);
          analyser.current = audioCtx.current.createAnalyser();
          analyser.current.fftSize = 2048;
          source.connect(analyser.current);
          const dados = new Float32Array(analyser.current.fftSize);
          monitor.current = setInterval(() => {
            if (!analyser.current || pausadoRef.current) return;
            analyser.current.getFloatTimeDomainData(dados);
            let soma = 0;
            for (let i = 0; i < dados.length; i++) soma += dados[i] * dados[i];
            const rms = Math.sqrt(soma / dados.length);
            if (rms > picoRmsBloco.current) picoRmsBloco.current = rms;
            const alvo = Math.min(1, rms / 0.08);
            const resposta = alvo > nivelSuavizado.current ? 0.56 : 0.24;
            nivelSuavizado.current += (alvo - nivelSuavizado.current) * resposta;
            setNivelVoz(nivelSuavizado.current);
          }, 90);
        }
      } catch {
        // Sem AudioContext (navegador antigo/sandbox): grava normalmente, só
        // sem o filtro de silêncio — nunca bloqueia a gravação por causa disso.
      }

      criarGravador();
    } catch (e) {
      limpar();
      setGravando(false);
      setPausado(false);
      setErro(
        (e as { name?: string })?.name === "NotAllowedError"
          ? "Microfone bloqueado. Libere nas permissões do navegador — ou digite o relato."
          : "Não achei um microfone. Digite o relato no campo abaixo.",
      );
    }
  }, [criarGravador, iniciarCronometro, limpar]);

  const pausar = useCallback(() => {
    const g = mr.current;
    if (!gravando || pausadoRef.current || !g || g.state !== "recording") return;
    g.pause();
    pausadoRef.current = true;
    setPausado(true);
    setNivelVoz(0);
    if (cron.current) clearInterval(cron.current);
    if (rodizio.current) clearTimeout(rodizio.current);
    cron.current = null;
    rodizio.current = null;
  }, [gravando]);

  const retomar = useCallback(() => {
    const g = mr.current;
    if (!gravando || !pausadoRef.current || !g || g.state !== "paused") return;
    g.resume();
    pausadoRef.current = false;
    setPausado(false);
    void audioCtx.current?.resume().catch(() => {});
    iniciarCronometro();
    agendarRodizio(g);
  }, [agendarRodizio, gravando, iniciarCronometro]);

  const parar = useCallback(() => {
    parando.current = true;
    pausadoRef.current = false;
    setPausado(false);
    if (cron.current) clearInterval(cron.current);
    if (rodizio.current) clearTimeout(rodizio.current);
    const g = mr.current;
    if (g && g.state !== "inactive") {
      g.stop();
    } else {
      const todos = blocos.current;
      limpar();
      setGravando(false);
      if (todos.length) onPronto(todos, mime.current, semSomBlocos.current);
    }
  }, [limpar, onPronto]);

  return {
    gravando,
    pausado,
    segundos,
    nivelVoz,
    erro,
    iniciar,
    pausar,
    retomar,
    parar,
    alternar: () => (gravando ? parar() : void iniciar()),
  };
}
