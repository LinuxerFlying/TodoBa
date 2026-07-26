import { format, parseISO, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';

export function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'yyyy-MM-dd', { locale: zhCN });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'MM-dd HH:mm', { locale: zhCN });
  } catch {
    return iso;
  }
}

export function isOverdue(due?: string, status?: string): boolean {
  if (!due) return false;
  if (status === 'done' || status === 'cancelled' || status === 'archived') return false;
  try {
    return isBefore(parseISO(due), startOfDay(new Date()));
  } catch {
    return false;
  }
}

export function daysUntilDue(due?: string): number | null {
  if (!due) return null;
  try {
    return differenceInDays(parseISO(due), startOfDay(new Date()));
  } catch {
    return null;
  }
}
