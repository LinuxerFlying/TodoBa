import Store from 'electron-store';
import { safeStorage } from 'electron';

export type SyncProvider = 'jianguoyun' | 'custom';

export interface SyncConfig {
  provider: SyncProvider;
  url: string;
  username: string;
  password: string;
  remoteDir: string;
  auto: boolean;
}

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

interface ConfigStoreShape {
  provider: SyncProvider;
  url: string;
  username: string;
  passwordEnc: string;
  passwordPlain: string;
  remoteDir: string;
  auto: boolean;
}

export interface SyncFileMeta {
  sha256: string;
  size: number;
}

export type RemoteManifest = Record<string, SyncFileMeta>;

interface StateStoreShape {
  deviceId: string;
  lastSyncAt: string;
  lastDirection: 'push' | 'pull' | '';
  remoteFiles: RemoteManifest;
}

const configStore = new Store<ConfigStoreShape>({
  name: 'todoba-sync',
  defaults: {
    provider: 'jianguoyun',
    url: 'https://dav.jianguoyun.com/dav/',
    username: '',
    passwordEnc: '',
    passwordPlain: '',
    remoteDir: 'TodoBa',
    auto: false
  }
});

const stateStore = new Store<StateStoreShape>({
  name: 'todoba-sync-state',
  defaults: {
    deviceId: '',
    lastSyncAt: '',
    lastDirection: '',
    remoteFiles: {}
  }
});

function encryptPassword(plain: string): { enc: string; fallback: string } {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      enc: safeStorage.encryptString(plain).toString('base64'),
      fallback: ''
    };
  }
  return { enc: '', fallback: plain };
}

function decryptPassword(): string {
  const enc = configStore.get('passwordEnc');
  if (enc) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(enc, 'base64'));
      }
      return '';
    } catch {
      return '';
    }
  }
  return configStore.get('passwordPlain');
}

export function isSyncConfigured(): boolean {
  const url = configStore.get('url');
  const username = configStore.get('username');
  const hasPassword = Boolean(configStore.get('passwordEnc') || configStore.get('passwordPlain'));
  return Boolean(url && username && hasPassword);
}

export function getSafeConfig(): SafeSyncConfig {
  return {
    provider: configStore.get('provider'),
    url: configStore.get('url'),
    username: configStore.get('username'),
    remoteDir: configStore.get('remoteDir'),
    auto: configStore.get('auto'),
    hasPassword: Boolean(configStore.get('passwordEnc') || configStore.get('passwordPlain')),
    configured: isSyncConfigured(),
    encryptionAvailable: safeStorage.isEncryptionAvailable()
  };
}

export function getConfig(): SyncConfig {
  return {
    provider: configStore.get('provider'),
    url: configStore.get('url'),
    username: configStore.get('username'),
    password: decryptPassword(),
    remoteDir: configStore.get('remoteDir'),
    auto: configStore.get('auto')
  };
}

export function saveConfig(patch: Partial<Omit<SyncConfig, 'password'>> & { password?: string }) {
  if (patch.provider) configStore.set('provider', patch.provider);
  if (patch.url !== undefined) configStore.set('url', patch.url.trim());
  if (patch.username !== undefined) configStore.set('username', patch.username.trim());
  if (patch.remoteDir !== undefined) configStore.set('remoteDir', patch.remoteDir.trim() || 'TodoBa');
  if (patch.auto !== undefined) configStore.set('auto', Boolean(patch.auto));
  if (patch.password !== undefined && patch.password !== '') {
    const { enc, fallback } = encryptPassword(patch.password);
    configStore.set('passwordEnc', enc);
    configStore.set('passwordPlain', fallback);
  }
}

export function setAutoSync(enabled: boolean) {
  configStore.set('auto', enabled);
}

export function getDeviceId(): string {
  let id = stateStore.get('deviceId');
  if (!id) {
    id =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    stateStore.set('deviceId', id);
  }
  return id;
}

export function getLastSyncAt(): string {
  return stateStore.get('lastSyncAt');
}

export function getLastDirection(): 'push' | 'pull' | '' {
  return stateStore.get('lastDirection');
}

export function getRemoteFiles(): RemoteManifest {
  return stateStore.get('remoteFiles') || {};
}

export function saveSyncSnapshot(direction: 'push' | 'pull', remoteFiles: RemoteManifest) {
  stateStore.set('lastSyncAt', new Date().toISOString());
  stateStore.set('lastDirection', direction);
  stateStore.set('remoteFiles', remoteFiles);
}
