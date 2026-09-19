import { afterEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import useRecorder, { type UseRecorder } from "../use-recorder";

class MediaRecorderFalso {
  static isTypeSupported() {
    return true;
  }

  state: RecordingState = "inactive";
  ondataavailable: ((evento: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"]) } as BlobEvent);
    this.onstop?.();
  }
}

describe("pausa da gravação web", () => {
  const nomesGlobais = [
    "window",
    "document",
    "navigator",
    "MediaRecorder",
    "IS_REACT_ACT_ENVIRONMENT",
  ] as const;
  let root: Root | null = null;
  let dom: JSDOM | null = null;
  let globaisOriginais = new Map<string, PropertyDescriptor | undefined>();

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    dom?.window.close();
    dom = null;
    for (const nome of nomesGlobais) {
      const descritor = globaisOriginais.get(nome);
      if (descritor) Object.defineProperty(globalThis, nome, descritor);
      else Reflect.deleteProperty(globalThis, nome);
    }
    globaisOriginais.clear();
  });

  test("pausa, retoma e finaliza o mesmo áudio", async () => {
    globaisOriginais = new Map(
      nomesGlobais.map((nome) => [nome, Object.getOwnPropertyDescriptor(globalThis, nome)]),
    );
    dom = new JSDOM("<div id='root'></div>");
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      MediaRecorder: MediaRecorderFalso,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop() {} }],
          }),
        },
      },
    });

    const gravador = { current: null as UseRecorder | null };
    let concluidos = 0;
    function Teste() {
      gravador.current = useRecorder({
        onPronto: () => {
          concluidos += 1;
        },
      });
      return null;
    }

    root = createRoot(dom.window.document.getElementById("root")!);
    await act(async () => root?.render(<Teste />));
    const atual = () => {
      if (!gravador.current) throw new Error("Hook não foi montado");
      return gravador.current;
    };
    await act(async () => atual().iniciar());
    expect(atual().gravando).toBe(true);
    expect(atual().pausado).toBe(false);

    act(() => atual().pausar());
    expect(atual().pausado).toBe(true);
    expect(atual().nivelVoz).toBe(0);

    act(() => atual().retomar());
    expect(atual().pausado).toBe(false);

    act(() => atual().parar());
    expect(atual().gravando).toBe(false);
    expect(concluidos).toBe(1);
  });
});
