/** Type definition for the Electron preload API exposed via contextBridge */
export type DesktopAction = "novo" | "stop";

export function executarAcaoDesktop(
  acao: DesktopAction,
  handlers: { novo: () => void; stop: () => void },
) {
  handlers[acao]();
}

export interface ElectronAPI {
  platform: string;

  // Shell
  openExternal: (url: string) => Promise<void>;

  // Notifications
  showNotification: (title: string, body: string) => Promise<void>;

  // Tray — atualiza o ícone na barra de menus conforme estado de gravação
  setRecording: (gravando: boolean) => Promise<void>;

  // Window controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;

  // Events
  onDeepLink: (cb: (url: string) => void) => () => void;
  /** Recebe comandos do tray/menu. */
  onTrayAction: (cb: (acao: DesktopAction) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function getDesktopAPI(): ElectronAPI | null {
  return window.electronAPI ?? null;
}

export function isDesktop(): boolean {
  return getDesktopAPI() !== null;
}
