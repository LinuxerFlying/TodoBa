import type { Todo, Quadrant, Status, Priority } from '../types/todo';
import { QUADRANT_ORDER } from '../types/todo';
import type { SortField, SortDir, ListFilters } from '../store/useUiStore';

const QUADRANT_INDEX: Record<Quadrant, number> = QUADRANT_ORDER.reduce(
  (acc, q, i) => {
    acc[q] = i;
    return acc;
  },
  {} as Record<Quadrant, number>
);

const STATUS_ORDER: Record<Status, number> = {
  todo: 0,
  'in-progress': 1,
  done: 2,
  cancelled: 3,
  archived: 4
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

function withDir(v: number, dir: SortDir): number {
  return dir === 'asc' ? v : -v;
}

function compareValues<T>(a: T, b: T, dir: SortDir): number {
  if (a === b) return 0;
  const r = a < b ? -1 : 1;
  return withDir(r, dir);
}

function compareOptionalString(a: string | undefined, b: string | undefined, dir: SortDir): number {
  if (a && b) return withDir(a.localeCompare(b), dir);
  if (a) return -1;
  if (b) return 1;
  return 0;
}

function smartCompare(a: Todo, b: Todo): number {
  if (a.status === 'done' && b.status !== 'done') return 1;
  if (b.status === 'done' && a.status !== 'done') return -1;
  const p = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
  if (p !== 0) return p;
  if (a.due && b.due) return a.due.localeCompare(b.due);
  if (a.due) return -1;
  if (b.due) return 1;
  return b.updated.localeCompare(a.updated);
}

export function compareTodos(a: Todo, b: Todo, field: SortField, dir: SortDir): number {
  let r = 0;
  switch (field) {
    case 'smart':
      r = smartCompare(a, b);
      break;
    case 'title':
      r = compareValues(a.title, b.title, dir);
      break;
    case 'quadrant':
      r = withDir(
        (QUADRANT_INDEX[a.quadrant] ?? 99) - (QUADRANT_INDEX[b.quadrant] ?? 99),
        dir
      );
      break;
    case 'status':
      r = withDir((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99), dir);
      break;
    case 'priority':
      r = withDir(
        (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
        dir
      );
      break;
    case 'progress':
      r = withDir(a.progress - b.progress, dir);
      break;
    case 'due':
      r = compareOptionalString(a.due, b.due, dir);
      break;
    case 'updated':
      r = compareValues(a.updated, b.updated, dir);
      break;
  }
  if (r !== 0) return r;
  const tie = b.updated.localeCompare(a.updated);
  if (tie !== 0) return tie;
  return a.id.localeCompare(b.id);
}

export function matchesListFilters(t: Todo, f: ListFilters): boolean {
  if (f.quadrant.length && !f.quadrant.includes(t.quadrant)) return false;
  if (f.status.length && !f.status.includes(t.status)) return false;
  if (f.priority.length && !f.priority.includes(t.priority)) return false;
  return true;
}

export function hasActiveFilters(f: ListFilters): boolean {
  return f.quadrant.length > 0 || f.status.length > 0 || f.priority.length > 0;
}
