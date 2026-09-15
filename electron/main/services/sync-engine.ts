import { BrowserWindow } from 'electron';
import fsp from 'node:fs/promises';
import path from 'node:path';
import * as nodeCrypto from 'node:crypto';
import type { Dirent } from 'node:fs';
import { WebDAVClient } from './webdav-client';
import { saveVersion } from './history';
import { vaultWatcher } from './file-watcher';
import { getSettings } from '../ipc/settings';
import {
  getConfig,
  getDeviceId,
  getRemoteFiles,
  isSyncConfigured,
  saveSyncSnapshot,
  type RemoteManifest,
  type SyncFileMeta
} from './sync-store';

const MANIFEST_NAME = 'todoba-sync.json';
const AUTO_PUSH_DEBOUNCE_MS = 20_000;

export interface SyncProgress {
  phase: 'scan' | 'upload' | 'download' | 'delete' | 'manifest' | 'done' | 'error';
  done: number;
  total: number;
  message?: string;
  direction: 'push' | 'pull' | '';
}

export interface SyncResult {
  ok: boolean;
  direction: 'push' | 'pull';
  transferred: number;
  deleted: number;
  conflicts: number;
  conflictFiles: string[];
  skipped: number;
  error?: string;
}

export interface SyncState {
  running: boolean;
  direction: 'push' | 'pull' | '';
  configured: boolean;
  auto: boolean;
  lastSyncAt: string;
  lastDirection: 'push' | 'pull' | '';
}

interface ManifestDoc {
  version: number;
  deviceId: string;
  updatedAt: string;
  files: RemoteManifest;
}

function broadcast(channel: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(channel, payload);
  }
}

function sha256(buf: Buffer): string {
  const bytes: Uint8Array = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return nodeCrypto.createHash('sha256').update(bytes).digest('hex');
}

async function scanLocalVault(vaultDir: string): Promise<Map<string, SyncFileMeta>> {
  const out = new Map<string, SyncFileMeta>();

  const mdEntries = await fsp.readdir(vaultDir, { withFileTypes: true });
  for (const entry of mdEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.endsWith('.tmp')) continue;
    const buf = await fsp.readFile(path.join(vaultDir, entry.name));
    out.set(entry.name, { sha256: sha256(buf), size: buf.length });
  }

  const walk = async (dir: string, relPrefix: string) => {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), rel);
      } else if (entry.isFile() && !entry.name.endsWith('.tmp')) {
        const buf = await fsp.readFile(path.join(dir, entry.name));
        out.set(rel, { sha256: sha256(buf), size: buf.length });
      }
    }
  };
  await walk(path.join(vaultDir, 'assets'), 'assets');

  return out;
}

async function readRemoteManifest(
  client: WebDAVClient,
  remoteDir: string
): Promise<ManifestDoc | null> {
  const text = await client.getText(`${remoteDir}/${MANIFEST_NAME}`);
  if (text == null) return null;
  try {
    const doc = JSON.parse(text) as ManifestDoc;
    if (!doc || typeof doc !== 'object' || !doc.files) return null;
    return doc;
  } catch {
    return null;
  }
}

async function writeRemoteManifest(
  client: WebDAVClient,
  remoteDir: string,
  files: RemoteManifest
) {
  const doc: ManifestDoc = {
    version: 1,
    deviceId: getDeviceId(),
    updatedAt: new Date().toISOString(),
    files
  };
  await client.putAtomic(`${remoteDir}/${MANIFEST_NAME}`, JSON.stringify(doc, null, 2));
}

async function writeLocalAtomic(fullPath: string, data: Buffer) {
  await fsp.mkdir(path.dirname(fullPath), { recursive: true });
  const tmp = fullPath + '.tmp';
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, fullPath);
}

async function backupLocalFile(vaultDir: string, rel: string) {
  const full = path.join(vaultDir, rel);
  if (!rel.includes('/') && rel.endsWith('.md')) {
    const id = rel.replace(/\.md$/, '');
    const content = await fsp.readFile(full, 'utf8');
    await saveVersion(vaultDir, id, content);
  } else {
    await writeLocalAtomic(path.join(vaultDir, '.sync-backup', rel), await fsp.readFile(full));
  }
}

function isMarkdownId(rel: string): string | null {
  if (!rel.includes('/') && rel.endsWith('.md')) return rel.replace(/\.md$/, '');
  return null;
}

class SyncEngine {
  private runningPromise: Promise<SyncResult> | null = null;
  private autoTimer: NodeJS.Timeout | null = null;
  private autoSubscribed = false;
  private state: SyncState = {
    running: false,
    direction: '',
    configured: false,
    auto: false,
    lastSyncAt: '',
    lastDirection: ''
  };

  isRunning() {
    return this.runningPromise !== null;
  }

  getState(): SyncState {
    return { ...this.state };
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    broadcast('sync:state', this.state);
  }

  refreshConfigState() {
    const cfg = getConfig();
    const configured = isSyncConfigured();
    this.setState({ configured, auto: cfg.auto });
    if (cfg.auto && configured) this.subscribeAuto();
  }

  private subscribeAuto() {
    if (this.autoSubscribed) return;
    this.autoSubscribed = true;
    vaultWatcher.onLocalChange(() => {
      if (!getConfig().auto || !isSyncConfigured()) return;
      if (this.autoTimer) clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(() => {
        this.autoTimer = null;
        this.run('push', true).catch(() => undefined);
      }, AUTO_PUSH_DEBOUNCE_MS);
    });
  }

  async run(direction: 'push' | 'pull', auto = false): Promise<SyncResult> {
    if (this.runningPromise) {
      return {
        ok: false,
        direction,
        transferred: 0,
        deleted: 0,
        conflicts: 0,
        conflictFiles: [],
        skipped: 0,
        error: auto ? '' : '同步正在进行中'
      };
    }
    const p = this.execute(direction, auto);
    this.runningPromise = p;
    try {
      return await p;
    } finally {
      this.runningPromise = null;
    }
  }

  private progress(p: SyncProgress) {
    broadcast('sync:progress', p);
  }

  private async execute(direction: 'push' | 'pull', auto: boolean): Promise<SyncResult> {
    const result: SyncResult = {
      ok: false,
      direction,
      transferred: 0,
      deleted: 0,
      conflicts: 0,
      conflictFiles: [],
      skipped: 0
    };
    this.setState({ running: true, direction });

    if (!isSyncConfigured()) {
      result.error = '请先填写并保存 WebDAV 配置';
      this.progress({ phase: 'error', done: 0, total: 0, message: result.error, direction });
      this.setState({ running: false, direction: '' });
      return result;
    }

    const cfg = getConfig();
    const vaultDir = getSettings().vaultPath;
    const client = new WebDAVClient(cfg.url, cfg.username, cfg.password);
    const remoteDir = cfg.remoteDir.replace(/^\/+|\/+$/g, '') || 'TodoBa';

    try {
      this.progress({ phase: 'scan', done: 0, total: 0, direction });
      await client.ensureDir(remoteDir);
      const [local, manifest] = await Promise.all([
        scanLocalVault(vaultDir),
        readRemoteManifest(client, remoteDir)
      ]);
      const R: RemoteManifest = { ...(manifest?.files || {}) };
      const P: RemoteManifest = getRemoteFiles();

      let newManifest = R;
      if (direction === 'push') {
        newManifest = await this.push(client, vaultDir, remoteDir, local, R, P, result);
      } else {
        await this.pull(client, vaultDir, remoteDir, local, R, P, result);
      }
      result.ok = true;
      saveSyncSnapshot(direction, newManifest);
      this.progress({
        phase: 'done',
        done: 0,
        total: 0,
        direction,
        message: auto ? '自动同步完成' : '同步完成'
      });
      this.setState({
        running: false,
        direction: '',
        lastSyncAt: new Date().toISOString(),
        lastDirection: direction
      });
      if (direction === 'pull') broadcast('sync:pulled', { at: Date.now() });
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e);
      this.progress({ phase: 'error', done: 0, total: 0, message: result.error, direction });
      this.setState({ running: false, direction: '' });
    }
    return result;
  }

  private async push(
    client: WebDAVClient,
    vaultDir: string,
    remoteDir: string,
    local: Map<string, SyncFileMeta>,
    R: RemoteManifest,
    P: RemoteManifest,
    result: SyncResult
  ): Promise<RemoteManifest> {
    const toUpload: string[] = [];
    for (const [rel, meta] of local) {
      if (R[rel]?.sha256 === meta.sha256) {
        result.skipped++;
        continue;
      }
      const remoteChanged = P[rel] && R[rel] && P[rel].sha256 !== R[rel].sha256;
      const localChanged = !P[rel] || P[rel].sha256 !== meta.sha256;
      if (remoteChanged && localChanged) {
        result.conflicts++;
        result.conflictFiles.push(rel);
        continue;
      }
      toUpload.push(rel);
    }

    this.progress({ phase: 'upload', done: 0, total: toUpload.length, direction: 'push' });
    let done = 0;
    for (const rel of toUpload) {
      await client.ensureParentDirs(`${remoteDir}/${rel}`);
      const data = await fsp.readFile(path.join(vaultDir, rel));
      await client.put(`${remoteDir}/${rel}`, data);
      const id = isMarkdownId(rel);
      if (id) vaultWatcher.markWrote(id);
      R[rel] = { ...local.get(rel)! };
      done++;
      result.transferred++;
      this.progress({ phase: 'upload', done, total: toUpload.length, direction: 'push' });
    }

    const toDelete: string[] = [];
    for (const rel of Object.keys(P)) {
      if (local.has(rel)) continue;
      if (R[rel] && R[rel].sha256 === P[rel].sha256) toDelete.push(rel);
    }
    if (toDelete.length) {
      this.progress({ phase: 'delete', done: 0, total: toDelete.length, direction: 'push' });
      let d = 0;
      for (const rel of toDelete) {
        await client.delete(`${remoteDir}/${rel}`);
        delete R[rel];
        d++;
        result.deleted++;
        this.progress({ phase: 'delete', done: d, total: toDelete.length, direction: 'push' });
      }
    }

    this.progress({ phase: 'manifest', done: 0, total: 1, direction: 'push' });
    await writeRemoteManifest(client, remoteDir, R);
    return R;
  }

  private async pull(
    client: WebDAVClient,
    vaultDir: string,
    remoteDir: string,
    local: Map<string, SyncFileMeta>,
    R: RemoteManifest,
    P: RemoteManifest,
    result: SyncResult
  ): Promise<void> {
    const toDownload: string[] = [];
    for (const rel of Object.keys(R)) {
      const localMeta = local.get(rel);
      const remoteSha = R[rel].sha256;
      if (!localMeta) {
        toDownload.push(rel);
        continue;
      }
      if (localMeta.sha256 === remoteSha) {
        result.skipped++;
        continue;
      }
      const localChanged = !P[rel] || P[rel].sha256 !== localMeta.sha256;
      const remoteChanged = !P[rel] || P[rel].sha256 !== remoteSha;
      if (localChanged && remoteChanged) {
        result.conflicts++;
        result.conflictFiles.push(rel);
      }
      toDownload.push(rel);
    }

    const toDeleteLocal: string[] = [];
    for (const rel of Object.keys(P)) {
      if (R[rel]) continue;
      const localMeta = local.get(rel);
      if (localMeta && localMeta.sha256 === P[rel].sha256) toDeleteLocal.push(rel);
    }

    vaultWatcher.pause();
    try {
      this.progress({ phase: 'download', done: 0, total: toDownload.length, direction: 'pull' });
      let done = 0;
      for (const rel of toDownload) {
        const buf = await client.getBuffer(`${remoteDir}/${rel}`);
        if (result.conflictFiles.includes(rel) && local.has(rel)) {
          await backupLocalFile(vaultDir, rel);
        }
        await writeLocalAtomic(path.join(vaultDir, rel), buf);
        const id = isMarkdownId(rel);
        if (id) vaultWatcher.markWrote(id);
        done++;
        result.transferred++;
        this.progress({ phase: 'download', done, total: toDownload.length, direction: 'pull' });
      }

      if (toDeleteLocal.length) {
        this.progress({ phase: 'delete', done: 0, total: toDeleteLocal.length, direction: 'pull' });
        let d = 0;
        for (const rel of toDeleteLocal) {
          await fsp.unlink(path.join(vaultDir, rel)).catch(() => undefined);
          const id = isMarkdownId(rel);
          if (id) vaultWatcher.markWrote(id);
          d++;
          result.deleted++;
          this.progress({ phase: 'delete', done: d, total: toDeleteLocal.length, direction: 'pull' });
        }
      }
    } finally {
      vaultWatcher.resume();
    }
  }
}

export const syncEngine = new SyncEngine();
