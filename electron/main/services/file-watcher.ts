import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { BrowserWindow } from 'electron';

export type VaultChangeType = 'add' | 'change' | 'unlink';

export class VaultWatcher {
  private watcher: FSWatcher | null = null;
  private justWrote = new Set<string>();
  private paused = false;
  private emitter = new EventEmitter();

  start(dir: string) {
    this.stop();
    this.paused = false;
    this.watcher = chokidar.watch(path.join(dir, '*.md'), {
      ignoreInitial: true,
      persistent: true,
      ignored: [/[/\\]\.[^/\\]+[/\\]/], // ignore dot-directories like .history
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
    });

    const handler = (type: VaultChangeType) => (filePath: string) => {
      const id = path.basename(filePath, path.extname(filePath));
      if (this.justWrote.has(id)) return;
      if (this.paused) return;
      this.emitter.emit('local-change', type, id);
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

  /** Suppress renderer notifications + local-change events while bulk sync writes land. */
  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  onLocalChange(cb: (type: VaultChangeType, id: string) => void): () => void {
    this.emitter.on('local-change', cb);
    return () => this.emitter.off('local-change', cb);
  }

  markWrote(id: string) {
    this.justWrote.add(id);
    setTimeout(() => this.justWrote.delete(id), 800);
  }
}

export const vaultWatcher = new VaultWatcher();
