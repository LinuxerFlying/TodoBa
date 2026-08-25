import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { getSettings } from './settings';

const IMAGE_FILTERS = [
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'] }
];

function safeBasename(name: string): string {
  const cleaned = name
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'image';
}

async function copyToAssets(srcPath: string): Promise<string> {
  const { vaultPath } = getSettings();
  const assetsDir = path.join(vaultPath, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  const ext = path.extname(srcPath).toLowerCase();
  const base = safeBasename(path.basename(srcPath, ext));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const destName = `${stamp}_${base}${ext}`;
  const destPath = path.join(assetsDir, destName);

  await fs.copyFile(srcPath, destPath);
  return `assets/${destName}`;
}

export function registerAssetsIpc() {
  ipcMain.handle('assets:import', async () => {
    const wins = BrowserWindow.getAllWindows();
    let win = BrowserWindow.getFocusedWindow();
    if (!win && wins.length > 0) win = wins[0];

    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }

    const result = await dialog.showOpenDialog(win!, {
      title: '选择图片',
      properties: ['openFile'],
      filters: IMAGE_FILTERS
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { path: null };
    }
    try {
      const rel = await copyToAssets(result.filePaths[0]);
      return { path: rel };
    } catch (e) {
      return { path: null, error: (e as Error).message };
    }
  });
}
