import { ipcMain } from 'electron';
import { WebDAVClient } from '../services/webdav-client';
import { syncEngine, type SyncResult } from '../services/sync-engine';
import {
  getConfig,
  getLastDirection,
  getLastSyncAt,
  getSafeConfig,
  isSyncConfigured,
  saveConfig,
  setAutoSync,
  type SyncProvider
} from '../services/sync-store';

interface ConfigInput {
  provider?: SyncProvider;
  url?: string;
  username?: string;
  password?: string;
  remoteDir?: string;
  auto?: boolean;
}

function normalizeUrl(input?: string): string {
  return (input || '').trim();
}

function validate(input: ConfigInput, requirePassword: boolean): string | null {
  if (input.provider !== undefined && input.provider !== 'jianguoyun' && input.provider !== 'custom') {
    return '服务商不合法';
  }
  if (input.url !== undefined) {
    const url = normalizeUrl(input.url);
    if (!/^https?:\/\/.+/i.test(url)) return '服务器地址需以 http:// 或 https:// 开头';
  }
  if (input.username !== undefined && !input.username.trim()) return '请填写 WebDAV 账户';
  if (requirePassword && !(input.password && input.password.length)) return '请填写应用密码';
  return null;
}

export function registerSyncIpc() {
  ipcMain.handle('sync:getConfig', () => getSafeConfig());

  ipcMain.handle('sync:saveConfig', (_e, input: ConfigInput = {}) => {
    const needPassword = !getSafeConfig().hasPassword;
    const err = validate(input, needPassword);
    if (err) return { ok: false, error: err };
    saveConfig({
      provider: input.provider,
      url: normalizeUrl(input.url),
      username: input.username,
      password: input.password,
      remoteDir: input.remoteDir,
      auto: input.auto
    });
    syncEngine.refreshConfigState();
    return { ok: true, config: getSafeConfig() };
  });

  ipcMain.handle('sync:testConnection', async (_e, input: ConfigInput = {}) => {
    const current = getConfig();
    const provider = input.provider || current.provider;
    const url = normalizeUrl(input.url) || current.url;
    const username = (input.username ?? '').trim() || current.username;
    const password = input.password || current.password;
    if (!/^https?:\/\/.+/i.test(url)) return { ok: false, message: '服务器地址不合法' };
    if (!username || !password) return { ok: false, message: '请填写账户和应用密码' };
    try {
      const client = new WebDAVClient(url, username, password);
      await client.test();
      return { ok: true, message: `连接成功（${provider === 'jianguoyun' ? '坚果云' : '自定义'}）` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle('sync:push', async (): Promise<SyncResult> => syncEngine.run('push'));
  ipcMain.handle('sync:pull', async (): Promise<SyncResult> => syncEngine.run('pull'));

  ipcMain.handle('sync:setAuto', (_e, { enabled }: { enabled: boolean }) => {
    setAutoSync(Boolean(enabled));
    syncEngine.refreshConfigState();
    return { ok: true };
  });

  ipcMain.handle('sync:getState', () => ({
    ...syncEngine.getState(),
    configured: isSyncConfigured(),
    lastSyncAt: getLastSyncAt(),
    lastDirection: getLastDirection()
  }));
}
