import matter from 'gray-matter';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Todo } from '../types/todo';

export function serializeTodo(todo: Todo): string {
  const frontmatter: Record<string, unknown> = {
    id: todo.id,
    title: todo.title,
    quadrant: todo.quadrant,
    status: todo.status,
    priority: todo.priority,
    progress: todo.progress
  };
  if (todo.due) frontmatter.due = todo.due;
  frontmatter.created = todo.created;
  frontmatter.updated = todo.updated;
  if (todo.tags.length > 0) frontmatter.tags = todo.tags;

  return matter.stringify(todo.body || '', frontmatter as never);
}

export async function writeTodoAtomic(dir: string, todo: Todo): Promise<void> {
  const finalPath = path.join(dir, `${todo.id}.md`);
  const tmpPath = path.join(dir, `${todo.id}.md.tmp`);
  const content = serializeTodo(todo);
  await fs.writeFile(tmpPath, content, 'utf8');
  await fs.rename(tmpPath, finalPath);
}

export async function deleteTodoFile(dir: string, id: string): Promise<void> {
  const p = path.join(dir, `${id}.md`);
  await fs.unlink(p).catch(() => undefined);
}
