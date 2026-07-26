import { ipcMain } from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import { app } from 'electron';

export interface Settings {
  theme: 'light' | 'dark' | 'eyecare' | 'evernote';
  vaultPath: string;
}

const store = new Store<Settings>({
  name: 'todoba-settings',
  defaults: {
    theme: 'evernote',
    vaultPath: path.join(app.getPath('documents'), 'TodoBa')
  }
});

export function getSettings(): Settings {
  return { theme: store.get('theme'), vaultPath: store.get('vaultPath') };
}

export function setSettings(partial: Partial<Settings>) {
  if (partial.theme) store.set('theme', partial.theme);
  if (partial.vaultPath) store.set('vaultPath', partial.vaultPath);
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', (_e, { key }: { key: keyof Settings }) => {
    return store.get(key);
  });
  ipcMain.handle('settings:set', (_e, { key, value }: { key: keyof Settings; value: unknown }) => {
    store.set(key, value as never);
    return { ok: true };
  });
}
