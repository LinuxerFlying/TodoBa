export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';
export type Status = 'todo' | 'in-progress' | 'done' | 'cancelled' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Todo {
  id: string;
  title: string;
  quadrant: Quadrant;
  status: Status;
  priority: Priority;
  progress: number;
  due?: string;
  created: string;
  updated: string;
  tags: string[];
  body: string;
}

export const QUADRANT_LABELS: Record<Quadrant, { title: string; subtitle: string }> = {
  q1: { title: '紧急 & 重要', subtitle: '立即做' },
  q2: { title: '重要 & 不紧急', subtitle: '计划做' },
  q3: { title: '紧急 & 不重要', subtitle: '授权做' },
  q4: { title: '不紧急 & 不重要', subtitle: '少做' }
};

export const STATUS_LABELS: Record<Status, string> = {
  todo: '待办',
  'in-progress': '进行中',
  done: '已完成',
  cancelled: '已取消',
  archived: '已归档'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急'
};
