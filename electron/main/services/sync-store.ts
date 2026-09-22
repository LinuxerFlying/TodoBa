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
  encEnabled: boolean;
  encSalt: string;
  encVerifier: string;
  encPasswordRemembered: string;
  encLastRemoteSalt: string;
  encIntent: 'on' | 'off' | null;
}

export interface SyncFileMeta {
  sha256: string;
  size: number;
  enc?: boolean;
  csha?: string;
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
    auto: false,
    encEnabled: false,
    encSalt: '',
    encVerifier: '',
    encPasswordRemembered: '',
    encLastRemoteSalt: '',
    encIntent: null
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

export interface EncryptionSettings {
  enabled: boolean;
  locked: boolean;
  remembered: boolean;
  salt: string;
}

let memEncPassword: string | null = null;

export function getEncSalt(): string {
  return configStore.get('encSalt');
}

export function getEncVerifier(): string {
  return configStore.get('encVerifier');
}

export function isEncryptionEnabled(): boolean {
  return configStore.get('encEnabled');
}

export function getEncryptionSettings(): EncryptionSettings {
  const enabled = configStore.get('encEnabled');
  const remembered = Boolean(configStore.get('encPasswordRemembered'));
  if (enabled && memEncPassword == null && remembered) {
    tryRememberedPassword();
  }
  const locked = enabled && memEncPassword == null;
  return {
    enabled,
    locked,
    remembered,
    salt: configStore.get('encSalt')
  };
}

export function saveEncryptionSetup(setup: {
  salt: string;
  verifier: string;
  password: string;
  remember: boolean;
}) {
  let remembered = '';
  if (setup.remember && safeStorage.isEncryptionAvailable()) {
    remembered = safeStorage
      .encryptString(setup.password)
      .toString('base64');
  }
  configStore.set('encSalt', setup.salt);
  configStore.set('encVerifier', setup.verifier);
  configStore.set('encPasswordRemembered', remembered);
  configStore.set('encEnabled', true);
  configStore.set('encIntent', 'on');
  memEncPassword = setup.password;
}

export function tryRememberedPassword(): string | null {
  const enc = configStore.get('encPasswordRemembered');
  if (!enc || !safeStorage.isEncryptionAvailable()) return null;
  try {
    const pw = safeStorage.decryptString(Buffer.from(enc, 'base64'));
    memEncPassword = pw;
    return pw;
  } catch {
    return null;
  }
}

export function setMemoryEncPassword(pw: string) {
  memEncPassword = pw;
}

export function lockEncryption() {
  memEncPassword = null;
}

export function getMemoryEncPassword(): string | null {
  return memEncPassword;
}

export function disableEncryptionStorage() {
  configStore.set('encEnabled', false);
  configStore.set('encPasswordRemembered', '');
  configStore.set('encIntent', 'off');
  memEncPassword = null;
}

export function updateRememberedPassword(password: string, remember: boolean) {
  let remembered = '';
  if (remember && safeStorage.isEncryptionAvailable()) {
    remembered = safeStorage.encryptString(password).toString('base64');
  }
  configStore.set('encPasswordRemembered', remembered);
}

export interface RemoteEncryptionInfo {
  enabled: boolean;
  salt: string;
  verifier: string;
}

export function reconcileEncryption(info: RemoteEncryptionInfo | null) {
  const intent = configStore.get('encIntent');
  const localEnabled = configStore.get('encEnabled');

  if (!info || !info.enabled) {
    if (!localEnabled) {
      if (intent === null) return;
      return;
    }
    if (intent === 'on') return;
    const lastSalt = configStore.get('encLastRemoteSalt');
    const localSalt = configStore.get('encSalt');
    if (intent === 'off' && lastSalt === localSalt && localSalt !== '') {
      configStore.set('encEnabled', false);
      configStore.set('encPasswordRemembered', '');
      configStore.set('encLastRemoteSalt', '');
      configStore.set('encIntent', null);
      memEncPassword = null;
    }
    return;
  }

  const remoteSalt = info.salt || '';
  const localSalt = configStore.get('encSalt');
  const seenSalt = configStore.get('encLastRemoteSalt');

  if (intent === 'on') return;

  if (intent === 'off') {
    if (remoteSalt === localSalt && remoteSalt === seenSalt) return;
  }

  if (localEnabled && localSalt === remoteSalt && intent === null) return;

  if (remoteSalt && remoteSalt !== seenSalt && remoteSalt !== localSalt) {
    configStore.set('encEnabled', true);
    if (info.salt) configStore.set('encSalt', info.salt);
    if (info.verifier) configStore.set('encVerifier', info.verifier);
    configStore.set('encIntent', null);
    memEncPassword = null;
  }
}

export function markEncryptionPushed(salt: string, enabled: boolean) {
  configStore.set('encLastRemoteSalt', enabled ? salt : '');
  configStore.set('encIntent', null);
}
