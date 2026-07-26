import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { BrowserWindow } from 'electron';

export class VaultWatcher {
  private watcher: FSWatcher | null = null;
  private justWrote = new Set<string>();

  start(dir: string) {
    this.stop();
    this.watcher = chokidar.watch(path.join(dir, '*.md'), {
      ignoreInitial: true,
      persistent: true,
      ignored: [/[/\\]\.[^/\\]+[/\\]/], // ignore dot-directories like .history
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
    });

    const handler = (type: 'add' | 'change' | 'unlink') => (filePath: string) => {
      const id = path.basename(filePath, path.extname(filePath));
      if (this.justWrote.has(id)) return;
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send('vault:changed', { type, id });
      });
    };
    this.watcher.on('add', handler('add'));
    this.watcher.on('change', handler('change'));
    this.watcher.on('unlink', handler('unlink'));
  }

  stop() {
    this.watcher?.close().catch(() => undefined);
    this.watcher = null;
  }

  markWrote(id: string) {
    this.justWrote.add(id);
    setTimeout(() => this.justWrote.delete(id), 800);
  }
}

export const vaultWatcher = new VaultWatcher();
