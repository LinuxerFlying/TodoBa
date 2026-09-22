import { ipcMain } from 'electron';
import { WebDAVClient } from '../services/webdav-client';
import { syncEngine, type SyncResult } from '../services/sync-engine';
import {
  checkVerifier,
  generateSalt,
  makeVerifier
} from '../services/crypto-vault';
import {
  disableEncryptionStorage,
  getConfig,
  getEncryptionSettings,
  getEncSalt,
  getEncVerifier,
  getLastDirection,
  getLastSyncAt,
  getSafeConfig,
  isSyncConfigured,
  lockEncryption,
  saveConfig,
  saveEncryptionSetup,
  setAutoSync,
  setMemoryEncPassword,
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

  ipcMain.handle('sync:encryption:getState', () => getEncryptionSettings());

  ipcMain.handle(
    'sync:encryption:enable',
    async (
      _e,
      input: { password: string; remember: boolean }
    ): Promise<{ ok: boolean; error?: string }> => {
      const password = (input?.password || '').trim();
      if (password.length < 6) return { ok: false, error: '加密密码至少 6 位' };
      try {
        const salt = generateSalt();
        const verifier = makeVerifier(password, salt);
        saveEncryptionSetup({
          salt: salt.toString('hex'),
          verifier,
          password,
          remember: Boolean(input?.remember)
        });
        if (isSyncConfigured()) {
          const r = await syncEngine.run('push');
          if (!r.ok) return { ok: false, error: r.error || '加密后重传失败' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  );

  ipcMain.handle(
    'sync:encryption:disable',
    async (): Promise<{ ok: boolean; error?: string }> => {
      try {
        disableEncryptionStorage();
        if (isSyncConfigured()) {
          const r = await syncEngine.run('push');
          if (!r.ok) return { ok: false, error: r.error || '明文回迁失败' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  );

  ipcMain.handle(
    'sync:encryption:unlock',
    (
      _e,
      input: { password: string }
    ): { ok: boolean; error?: string } => {
      const password = (input?.password || '').trim();
      const verifier = getEncVerifier();
      const salt = getEncSalt();
      if (!verifier || !salt) return { ok: false, error: '加密尚未初始化' };
      if (!checkVerifier(verifier, password)) {
        return { ok: false, error: '加密密码不正确' };
      }
      setMemoryEncPassword(password);
      return { ok: true };
    }
  );

  ipcMain.handle('sync:encryption:lock', () => {
    lockEncryption();
    return { ok: true };
  });

  ipcMain.handle(
    'sync:encryption:changePassword',
    async (
      _e,
      input: { oldPassword: string; newPassword: string; remember: boolean }
    ): Promise<{ ok: boolean; error?: string }> => {
      const oldPassword = (input?.oldPassword || '').trim();
      const newPassword = (input?.newPassword || '').trim();
      if (newPassword.length < 6) return { ok: false, error: '新密码至少 6 位' };
      const verifier = getEncVerifier();
      if (!verifier || !checkVerifier(verifier, oldPassword)) {
        return { ok: false, error: '原密码不正确' };
      }
      const salt = generateSalt();
      const newVerifier = makeVerifier(newPassword, salt);
      saveEncryptionSetup({
        salt: salt.toString('hex'),
        verifier: newVerifier,
        password: newPassword,
        remember: Boolean(input?.remember)
      });
      if (isSyncConfigured()) {
        const r = await syncEngine.run('push');
        if (!r.ok) return { ok: false, error: r.error || '改密后重传失败' };
      }
      return { ok: true };
    }
  );

}
