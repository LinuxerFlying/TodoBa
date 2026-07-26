import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { registerTodosIpc } from './ipc/todos';
import { registerSettingsIpc, getSettings } from './ipc/settings';
import { vaultWatcher } from './services/file-watcher';
import fs from 'node:fs/promises';

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

async function ensureDefaultVault() {
  const { vaultPath } = getSettings();
  await fs.mkdir(vaultPath, { recursive: true });
  return vaultPath;
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
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  const vaultPath = await ensureDefaultVault();
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
