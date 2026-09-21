import { ipcMain } from 'electron';
import {
  checkNow,
  downloadUpdate,
  getUpdaterState,
  quitAndInstall
} from '../services/updater';

export function registerUpdaterIpc() {
  ipcMain.handle('updater:getState', () => getUpdaterState());

  ipcMain.handle('updater:check', async () => {
    try {
      return await checkNow();
    } catch (e) {
      return getUpdaterState();
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      return await downloadUpdate();
    } catch (e) {
      return getUpdaterState();
    }
  });

  ipcMain.handle('updater:install', () => {
    quitAndInstall();
    return { ok: true };
  });
}
