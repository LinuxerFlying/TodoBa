import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdaterState {
  status: UpdaterStatus;
  currentVersion: string;
  newVersion: string | null;
  releaseNotes: string | null;
  progress: number;
  error: string | null;
}

let initialized = false;
let state: UpdaterState = {
  status: 'idle',
  currentVersion: '',
  newVersion: null,
  releaseNotes: null,
  progress: 0,
  error: null
};

function broadcast() {
  const payload = { ...state };
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send('updater:state', payload);
  }
}

function patch(p: Partial<UpdaterState>) {
  state = { ...state, ...p };
  broadcast();
}

function notesToText(notes: unknown): string | null {
  if (!notes) return null;
  if (typeof notes === 'string') return notes.trim() || null;
  if (Array.isArray(notes)) {
    return notes
      .map((n) => (typeof n === 'string' ? n : (n as { note?: string })?.note || ''))
      .join('\n')
      .trim() || null;
  }
  return null;
}

export function initUpdater(): void {
  if (initialized) return;
  initialized = true;

  state = { ...state, currentVersion: app.getVersion() };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (...a: unknown[]) => console.log('[updater]', ...a),
    warn: (...a: unknown[]) => console.warn('[updater]', ...a),
    error: (...a: unknown[]) => console.error('[updater]', ...a),
    debug: () => undefined
  };

  autoUpdater.on('checking-for-update', () => {
    patch({ status: 'checking', error: null });
  });

  autoUpdater.on('update-available', (info) => {
    patch({
      status: 'available',
      newVersion: info.version || null,
      releaseNotes: notesToText(info.releaseNotes),
      progress: 0,
      error: null
    });
  });

  autoUpdater.on('update-not-available', () => {
    patch({
      status: 'not-available',
      newVersion: null,
      releaseNotes: null,
      progress: 0,
      error: null
    });
  });

  autoUpdater.on('download-progress', (p) => {
    patch({
      status: 'downloading',
      progress: Math.round(p.percent || 0)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    patch({
      status: 'downloaded',
      progress: 100,
      newVersion: info.version || state.newVersion,
      releaseNotes: notesToText(info.releaseNotes) ?? state.releaseNotes
    });
  });

  autoUpdater.on('error', (e: Error | null) => {
    patch({
      status: 'error',
      error: e?.message || '更新失败，请稍后再试'
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.error('[updater] startup check failed', e);
    });
  }, 10_000);
}

export async function checkNow(): Promise<UpdaterState> {
  await autoUpdater.checkForUpdates();
  return { ...state };
}

export async function downloadUpdate(): Promise<UpdaterState> {
  await autoUpdater.downloadUpdate();
  return { ...state };
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

export function getUpdaterState(): UpdaterState {
  return { ...state };
}
