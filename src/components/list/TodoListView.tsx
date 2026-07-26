import { useMemo } from 'react';
import { useTodoStore } from '../../store/useTodoStore';
import { useUiStore } from '../../store/useUiStore';
import { QUADRANT_LABELS, STATUS_LABELS } from '../../types/todo';
import type { Todo } from '../../types/todo';
import { cx } from '../../lib/classnames';
import { formatDate, isOverdue } from '../../lib/date';

function matchesSearch(t: Todo, q: string, tag: string | null, showArchived: boolean) {
  if (!showArchived && t.status === 'archived') return false;
  if (tag && !t.tags.includes(tag)) return false;
  if (q) {
    const needle = q.toLowerCase();
    if (
      !t.title.toLowerCase().includes(needle) &&
      !t.body.toLowerCase().includes(needle) &&
      !t.tags.some((x) => x.toLowerCase().includes(needle))
    ) {
      return false;
    }
  }
  return true;
}

export function TodoListView() {
  const todos = useTodoStore((s) => s.todos);
  const selectedId = useTodoStore((s) => s.selectedId);
  const select = useTodoStore((s) => s.select);
  const search = useUiStore((s) => s.searchQuery);
  const activeTag = useUiStore((s) => s.activeTag);
  const showArchived = useUiStore((s) => s.showArchived);

  const list = useMemo(() => {
    const arr = Object.values(todos).filter((t) =>
      matchesSearch(t, search, activeTag, showArchived)
    );
    const prio: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    arr.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      const p = (prio[a.priority] ?? 9) - (prio[b.priority] ?? 9);
      if (p !== 0) return p;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return b.updated.localeCompare(a.updated);
    });
    return arr;
  }, [todos, search, activeTag, showArchived]);

  if (list.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">
          没有匹配的事项。<br />
          点击左侧「新建事项」开始记录你的第一个待办。
        </div>
      </div>
    );
  }

  return (
    <div className="todo-list">
      <table>
        <thead>
          <tr>
            <th style={{ width: '34%' }}>标题</th>
            <th>象限</th>
            <th>状态</th>
            <th>优先级</th>
            <th>进度</th>
            <th>截止</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => {
            const overdue = isOverdue(t.due, t.status);
            return (
              <tr
                key={t.id}
                className={cx(selectedId === t.id && 'selected')}
                onClick={() => select(t.id)}
              >
                <td>
                  <span className={cx('list-title', t.status === 'done' && 'done')}>
                    {t.title}
                  </span>
                  {t.tags.length > 0 && (
                    <span style={{ marginLeft: 6 }}>
                      {t.tags.map((tg) => (
                        <span
                          key={tg}
                          style={{
                            fontSize: 10,
                            padding: '0 5px',
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                            borderRadius: 3,
                            marginRight: 3
                          }}
                        >
                          {tg}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {QUADRANT_LABELS[t.quadrant].title}
                </td>
                <td style={{ fontSize: 12 }}>{STATUS_LABELS[t.status]}</td>
                <td style={{ fontSize: 12 }}>{t.priority}</td>
                <td>
                  <div className="list-progress">
                    <div
                      className="list-progress-bar"
                      style={{
                        width: `${t.progress}%`,
                        background: t.progress >= 100 ? 'var(--success)' : 'var(--accent)'
                      }}
                    />
                  </div>
                </td>
                <td
                  style={{
                    fontSize: 12,
                    color: overdue ? 'var(--danger)' : 'var(--text-muted)',
                    fontWeight: overdue ? 600 : 400
                  }}
                >
                  {t.due ? formatDate(t.due) : '—'}
                </td>
                <td style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {formatDate(t.updated)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
