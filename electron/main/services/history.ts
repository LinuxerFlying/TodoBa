import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_VERSIONS_PER_TODO = 50;

function historyDirFor(vaultDir: string, id: string) {
  return path.join(vaultDir, '.history', id);
}

export interface VersionMeta {
  version: string;     // timestamp ISO filename-safe
  createdAt: string;   // ISO
  size: number;
}

/**
 * Save a version snapshot of a todo's raw markdown content.
 * Called BEFORE overwriting the current file during update/create.
 */
export async function saveVersion(vaultDir: string, id: string, rawContent: string): Promise<void> {
  if (!rawContent || !rawContent.trim()) return;
  const dir = historyDirFor(vaultDir, id);
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${stamp}.md`);
  await fs.writeFile(filePath, rawContent, 'utf8');
  // Prune old versions if over limit
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')).sort();
    while (files.length > MAX_VERSIONS_PER_TODO) {
      const old = files.shift()!;
      await fs.unlink(path.join(dir, old)).catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}

export async function listVersions(vaultDir: string, id: string): Promise<VersionMeta[]> {
  const dir = historyDirFor(vaultDir, id);
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')).sort();
    const out: VersionMeta[] = [];
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = await fs.stat(full);
      out.push({
        version: f.replace(/\.md$/, ''),
        createdAt: parseStamp(f.replace(/\.md$/, '')),
        size: stat.size
      });
    }
    return out.reverse(); // newest first
  } catch {
    return [];
  }
}

export async function readVersion(vaultDir: string, id: string, version: string): Promise<string> {
  const filePath = path.join(historyDirFor(vaultDir, id), `${version}.md`);
  return fs.readFile(filePath, 'utf8');
}

function parseStamp(stamp: string): string {
  // inverse of toISOString replace: 2026-07-25T09-14-00-000Z → 2026-07-25T09:14:00.000Z
  const m = stamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!m) return stamp;
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
}
