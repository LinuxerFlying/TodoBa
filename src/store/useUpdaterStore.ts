import { create } from 'zustand';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdaterStateData {
  status: UpdaterStatus;
  currentVersion: string;
  newVersion: string | null;
  releaseNotes: string | null;
  progress: number;
  error: string | null;
}

interface UpdaterState {
  state: UpdaterStateData;
  loaded: boolean;
  init: () => Promise<void>;
  check: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
}

const DEFAULT_STATE: UpdaterStateData = {
  status: 'idle',
  currentVersion: '',
  newVersion: null,
  releaseNotes: null,
  progress: 0,
  error: null
};

let initPromise: Promise<void> | null = null;

export const useUpdaterStore = create<UpdaterState>((set) => ({
  state: DEFAULT_STATE,
  loaded: false,

  init: () => {
    if (!initPromise) {
      initPromise = (async () => {
        const current = (await window.api.updater.getState()) as UpdaterStateData;
        set({ state: current, loaded: true });
        window.api.updater.onChange((payload) => {
          set({ state: payload as UpdaterStateData });
        });
      })();
    }
    return initPromise;
  },

  check: async () => {
    const s = (await window.api.updater.check()) as UpdaterStateData;
    set({ state: s });
  },

  download: async () => {
    const s = (await window.api.updater.download()) as UpdaterStateData;
    set({ state: s });
  },

  install: async () => {
    await window.api.updater.install();
  }
}));
