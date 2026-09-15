import { create } from 'zustand';

export type SyncProvider = 'jianguoyun' | 'custom';

export interface SafeSyncConfig {
  provider: SyncProvider;
  url: string;
  username: string;
  remoteDir: string;
  auto: boolean;
  hasPassword: boolean;
  configured: boolean;
  encryptionAvailable: boolean;
}

export interface SyncProgressState {
  phase: 'scan' | 'upload' | 'download' | 'delete' | 'manifest' | 'done' | 'error';
  done: number;
  total: number;
  message?: string;
  direction: 'push' | 'pull' | '';
}

export interface SyncRunResult {
  ok: boolean;
  direction: 'push' | 'pull';
  transferred: number;
  deleted: number;
  conflicts: number;
  conflictFiles: string[];
  skipped: number;
  error?: string;
}

interface SyncState {
  loaded: boolean;
  modalOpen: boolean;
  configured: boolean;
  auto: boolean;
  running: boolean;
  direction: 'push' | 'pull' | '';
  lastSyncAt: string;
  lastDirection: 'push' | 'pull' | '';
  progress: SyncProgressState | null;
  config: SafeSyncConfig | null;

  init: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  setAuto: (enabled: boolean) => Promise<void>;
  push: () => Promise<SyncRunResult | null>;
  pull: () => Promise<SyncRunResult | null>;
}

const EMPTY_CONFIG: SafeSyncConfig = {
  provider: 'jianguoyun',
  url: 'https://dav.jianguoyun.com/dav/',
  username: '',
  remoteDir: 'TodoBa',
  auto: false,
  hasPassword: false,
  configured: false,
  encryptionAvailable: true
};

let initPromise: Promise<void> | null = null;

export const useSyncStore = create<SyncState>((set, get) => ({
  loaded: false,
  modalOpen: false,
  configured: false,
  auto: false,
  running: false,
  direction: '',
  lastSyncAt: '',
  lastDirection: '',
  progress: null,
  config: null,

  init: () => {
    if (!initPromise) {
      initPromise = (async () => {
        const [config, state] = (await Promise.all([
          window.api.sync.getConfig(),
          window.api.sync.getState()
        ])) as [SafeSyncConfig, {
          configured: boolean;
          auto: boolean;
          running: boolean;
          direction: 'push' | 'pull' | '';
          lastSyncAt: string;
          lastDirection: 'push' | 'pull' | '';
        }];
        set({
          loaded: true,
          config,
          configured: state.configured,
          auto: state.auto,
          running: state.running,
          direction: state.direction,
          lastSyncAt: state.lastSyncAt,
          lastDirection: state.lastDirection
        });

        window.api.sync.onState((payload) => {
          const s = payload as Partial<SyncState>;
          set({
            configured: s.configured ?? get().configured,
            auto: s.auto ?? get().auto,
            running: s.running ?? get().running,
            direction: s.direction ?? get().direction,
            lastSyncAt: s.lastSyncAt ?? get().lastSyncAt,
            lastDirection: s.lastDirection ?? get().lastDirection
          });
        });
        window.api.sync.onProgress((payload) => {
          set({ progress: payload as SyncProgressState });
        });
      })();
    }
    return initPromise;
  },

  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),

  refreshConfig: async () => {
    const config = (await window.api.sync.getConfig()) as SafeSyncConfig;
    set({ config, configured: config.configured, auto: config.auto });
  },

  setAuto: async (enabled) => {
    set({ auto: enabled });
    await window.api.sync.setAuto(enabled);
  },

  push: async () => {
    if (get().running) return null;
    set({ running: true, direction: 'push', progress: null });
    const result = (await window.api.sync.push()) as SyncRunResult;
    set({ running: false, direction: '', progress: null });
    return result;
  },
  pull: async () => {
    if (get().running) return null;
    set({ running: true, direction: 'pull', progress: null });
    const result = (await window.api.sync.pull()) as SyncRunResult;
    set({ running: false, direction: '', progress: null });
    return result;
  }
}));
