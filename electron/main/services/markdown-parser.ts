import matter from 'gray-matter';
import fs from 'node:fs/promises';
import type { Todo, Quadrant, Status, Priority } from '../types/todo';
import { newId } from './id';

const VALID_QUADRANTS: Quadrant[] = ['q1', 'q2', 'q3', 'q4'];
const VALID_STATUS: Status[] = ['todo', 'in-progress', 'done', 'cancelled', 'archived'];
const VALID_PRIORITY: Priority[] = ['low', 'medium', 'high', 'critical'];

function clampQuadrant(q: unknown): Quadrant {
  return typeof q === 'string' && (VALID_QUADRANTS as string[]).includes(q) ? (q as Quadrant) : 'q2';
}
function clampStatus(s: unknown): Status {
  return typeof s === 'string' && (VALID_STATUS as string[]).includes(s) ? (s as Status) : 'todo';
}
function clampPriority(p: unknown): Priority {
  return typeof p === 'string' && (VALID_PRIORITY as string[]).includes(p) ? (p as Priority) : 'medium';
}
function clampProgress(n: unknown): number {
  const v = typeof n === 'number' ? n : parseInt(String(n ?? 0), 10);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function parseTodoFile(content: string, fallbackId?: string): Omit<Todo, 'created' | 'updated'> & { created?: string; updated?: string } {
  const { data, content: body } = matter(content);
  return {
    id: typeof data.id === 'string' && data.id ? data.id : (fallbackId ?? newId()),
    title: typeof data.title === 'string' ? data.title : '未命名事项',
    quadrant: clampQuadrant(data.quadrant),
    status: clampStatus(data.status),
    priority: clampPriority(data.priority),
    progress: clampProgress(data.progress),
    due: typeof data.due === 'string' && data.due ? data.due : undefined,
    tags: toStringArray(data.tags),
    body: body.replace(/^\s+/, '').replace(/\s+$/, ''),
    created: typeof data.created === 'string' ? data.created : undefined,
    updated: typeof data.updated === 'string' ? data.updated : undefined
  };
}

export async function readTodoFile(filePath: string, fallbackId: string): Promise<Todo | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = parseTodoFile(raw, fallbackId);
    const stat = await fs.stat(filePath);
    const mtime = stat.mtime.toISOString();
    return {
      ...parsed,
      created: parsed.created ?? mtime,
      updated: parsed.updated ?? mtime
    } as Todo;
  } catch (err) {
    console.error('Failed to read todo file:', filePath, err);
    return null;
  }
}
