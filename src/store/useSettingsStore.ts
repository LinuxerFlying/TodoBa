import { create } from 'zustand';
import type { Theme } from '../types/todo';

interface SettingsState {
  theme: Theme;
  vaultPath: string;
  loaded: boolean;
  init: () => Promise<void>;
  setTheme: (t: Theme) => Promise<void>;
  setVaultPath: (p: string) => Promise<void>;
}

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'evernote',
  vaultPath: '',
  loaded: false,
  init: async () => {
    const [theme, vaultPath] = await Promise.all([
      window.api.settings.get('theme') as Promise<Theme>,
      window.api.settings.get('vaultPath') as Promise<string>
    ]);
    applyTheme(theme || 'evernote');
    set({ theme: theme || 'evernote', vaultPath: vaultPath || '', loaded: true });
  },
  setTheme: async (t) => {
    applyTheme(t);
    set({ theme: t });
    await window.api.settings.set('theme', t);
  },
  setVaultPath: async (p) => {
    set({ vaultPath: p });
    await window.api.settings.set('vaultPath', p);
  }
}));
