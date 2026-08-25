import { app, BrowserWindow, shell, ipcMain, protocol } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { registerTodosIpc } from './ipc/todos';
import { registerSettingsIpc, getSettings } from './ipc/settings';
import { registerAssetsIpc } from './ipc/assets';
import { vaultWatcher } from './services/file-watcher';
import fsp from 'node:fs/promises';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'todoba-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: false
    }
  }
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '../..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'out/main');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'out/renderer');
export const PRELOAD_DIST = path.join(process.env.APP_ROOT, 'out/preload');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'src')
  : RENDERER_DIST;

let win: BrowserWindow | null = null;

ipcMain.handle('ping', () => 'pong from TodoBa main process');

ipcMain.handle('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});
ipcMain.handle('window:maximize', async () => {
  const w = BrowserWindow.getFocusedWindow();
  if (!w) return false;
  if (w.isMaximized()) w.unmaximize();
  else w.maximize();
  return w.isMaximized();
});
ipcMain.handle('window:isMaximized', () => BrowserWindow.getFocusedWindow()?.isMaximized() ?? false);
ipcMain.handle('window:close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

registerSettingsIpc();
registerTodosIpc();
registerAssetsIpc();

async function ensureDefaultVault() {
  const { vaultPath } = getSettings();
  await fsp.mkdir(vaultPath, { recursive: true });
  await fsp.mkdir(path.join(vaultPath, 'assets'), { recursive: true });
  return vaultPath;
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon'
};

function registerAssetProtocol() {
  protocol.handle('todoba-asset', async (request) => {
    try {
      const url = new URL(request.url);
      console.log('[asset] request:', request.url, 'host:', url.host, 'pathname:', url.pathname);
      let rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (url.host && url.host !== 'local' && !rel) {
        rel = decodeURIComponent(url.host + url.pathname);
      }
      const { vaultPath } = getSettings();
      const resolvedBase = path.resolve(vaultPath);
      const resolved = path.resolve(resolvedBase, rel);
      console.log('[asset] resolved:', resolved, 'base:', resolvedBase);
      if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }
      const data = await fsp.readFile(resolved);
      const ext = path.extname(resolved).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      console.log('[asset] serving:', resolved, 'mime:', mime, 'bytes:', data.length);
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (e) {
      console.error('[asset] error:', e);
      return new Response('Not found: ' + (e as Error).message, { status: 404 });
    }
  });
  console.log('[asset] protocol registered');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'TodoBa',
    backgroundColor: '#f6f1e1',
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    frame: false,
    webPreferences: {
      preload: path.join(PRELOAD_DIST, 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
  });
}

app.whenReady().then(async () => {
  const vaultPath = await ensureDefaultVault();
  registerAssetProtocol();
  vaultWatcher.start(vaultPath);
  createWindow();
});

app.on('window-all-closed', () => {
  vaultWatcher.stop();
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
