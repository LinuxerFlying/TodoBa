import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Todo, Quadrant, Status, Priority } from '../types/todo';
import { readTodoFile, parseTodoFile } from '../services/markdown-parser';
import { writeTodoAtomic, deleteTodoFile, serializeTodo } from '../services/markdown-writer';
import { newId } from '../services/id';
import { vaultWatcher } from '../services/file-watcher';
import { getSettings } from './settings';
import { saveVersion, listVersions, readVersion } from '../services/history';

async function ensureVault(): Promise<string> {
  const { vaultPath } = getSettings();
  await fs.mkdir(vaultPath, { recursive: true });
  return vaultPath;
}

async function listTodos(): Promise<Todo[]> {
  const dir = await ensureVault();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const mdFiles = entries.filter((f) => f.endsWith('.md') && !f.endsWith('.tmp'));
  const todos: Todo[] = [];
  for (const f of mdFiles) {
    const id = path.basename(f, '.md');
    const todo = await readTodoFile(path.join(dir, f), id);
    if (todo) todos.push(todo);
  }
  return todos;
}

function now(): string {
  return new Date().toISOString();
}

export function registerTodosIpc() {
  ipcMain.handle('todos:list', async () => {
    return listTodos();
  });

  ipcMain.handle('todos:read', async (_e, { id }: { id: string }) => {
    const dir = await ensureVault();
    return readTodoFile(path.join(dir, `${id}.md`), id);
  });

  ipcMain.handle('todos:create', async (_e, { data }: { data: Partial<Todo> }) => {
    const dir = await ensureVault();
    const id = data.id || newId();
    const ts = now();
    const todo: Todo = {
      id,
      title: data.title || '新事项',
      quadrant: (data.quadrant as Quadrant) || 'q2',
      status: (data.status as Status) || 'todo',
      priority: (data.priority as Priority) || 'medium',
      progress: typeof data.progress === 'number' ? data.progress : 0,
      due: data.due,
      tags: Array.isArray(data.tags) ? data.tags : [],
      body: data.body || '',
      created: ts,
      updated: ts
    };
    await writeTodoAtomic(dir, todo);
    vaultWatcher.markWrote(id);
    return todo;
  });

  ipcMain.handle('todos:update', async (_e, { id, patch }: { id: string; patch: Partial<Todo> }) => {
    const dir = await ensureVault();
    const filePath = path.join(dir, `${id}.md`);
    const existing = await readTodoFile(filePath, id);
    if (!existing) throw new Error(`Todo ${id} not found`);
    // Snapshot the existing content as a version before overwriting (only if it differs)
    try {
      const oldRaw = await fs.readFile(filePath, 'utf8');
      const updated: Todo = { ...existing, ...patch, id, updated: now() };
      const newRaw = serializeTodo(updated);
      if (oldRaw.trim() !== newRaw.trim()) {
        await saveVersion(dir, id, oldRaw);
      }
      await writeTodoAtomic(dir, updated);
      vaultWatcher.markWrote(id);
      return updated;
    } catch (err) {
      const updated: Todo = { ...existing, ...patch, id, updated: now() };
      await writeTodoAtomic(dir, updated);
      vaultWatcher.markWrote(id);
      return updated;
    }
  });

  ipcMain.handle('todos:delete', async (_e, { id }: { id: string }) => {
    const dir = await ensureVault();
    await deleteTodoFile(dir, id);
    vaultWatcher.markWrote(id);
    return { ok: true };
  });

  ipcMain.handle('todos:batchUpdate', async (_e, { ids, patch }: { ids: string[]; patch: Partial<Todo> }) => {
    const dir = await ensureVault();
    const results: Todo[] = [];
    for (const id of ids) {
      const existing = await readTodoFile(path.join(dir, `${id}.md`), id);
      if (!existing) continue;
      const updated: Todo = { ...existing, ...patch, id, updated: now() };
      await writeTodoAtomic(dir, updated);
      vaultWatcher.markWrote(id);
      results.push(updated);
    }
    return results;
  });

  ipcMain.handle('vault:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 TodoBa 数据目录',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return { path: null };
    return { path: result.filePaths[0] };
  });

  ipcMain.handle('vault:scan', async () => {
    const dir = await ensureVault();
    const todos = await listTodos();
    return { path: dir, count: todos.length };
  });

  ipcMain.handle('todos:versions', async (_e, { id }: { id: string }) => {
    const dir = await ensureVault();
    return listVersions(dir, id);
  });

  ipcMain.handle('todos:readVersion', async (_e, { id, version }: { id: string; version: string }) => {
    const dir = await ensureVault();
    const raw = await readVersion(dir, id, version);
    const parsed = parseTodoFile(raw, id);
    return { raw, meta: parsed };
  });

  ipcMain.handle('todos:rollback', async (_e, { id, version }: { id: string; version: string }) => {
    const dir = await ensureVault();
    const filePath = path.join(dir, `${id}.md`);
    // Snapshot current state first so rollback is reversible
    try {
      const current = await fs.readFile(filePath, 'utf8');
      if (current.trim()) await saveVersion(dir, id, current);
    } catch {
      /* current may not exist yet */
    }
    // Read the target version and write it back as current
    const raw = await readVersion(dir, id, version);
    const parsed = parseTodoFile(raw, id);
    // Preserve the original `created` timestamp if it existed; otherwise use now
    const created =
      typeof parsed.created === 'string' && parsed.created
        ? parsed.created
        : (await readTodoFile(filePath, id))?.created || now();
    const restored: Todo = {
      ...(parsed as Todo),
      id,
      created,
      updated: now()
    };
    await writeTodoAtomic(dir, restored);
    vaultWatcher.markWrote(id);
    return restored;
  });
}
