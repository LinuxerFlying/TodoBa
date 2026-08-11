import { useMemo } from 'react';
import { useTodoStore } from '../../store/useTodoStore';
import { useUiStore, type SortField } from '../../store/useUiStore';
import { QUADRANT_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '../../types/todo';
import type { Todo } from '../../types/todo';
import { cx } from '../../lib/classnames';
import { formatDate, isOverdue } from '../../lib/date';
import { compareTodos, hasActiveFilters, matchesListFilters } from '../../lib/sort';
import { ListToolbar } from './ListToolbar';

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

interface Column {
  key: SortField;
  label: string;
  width?: string;
  sortable?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'title', label: '标题', width: '30%', sortable: true },
  { key: 'quadrant', label: '象限', sortable: true },
  { key: 'status', label: '状态', sortable: true },
  { key: 'priority', label: '优先级', sortable: true },
  { key: 'progress', label: '进度', sortable: true },
  { key: 'due', label: '截止', sortable: true },
  { key: 'updated', label: '更新', sortable: true }
];

export function TodoListView() {
  const todos = useTodoStore((s) => s.todos);
  const selectedId = useTodoStore((s) => s.selectedId);
  const select = useTodoStore((s) => s.select);
  const search = useUiStore((s) => s.searchQuery);
  const activeTag = useUiStore((s) => s.activeTag);
  const showArchived = useUiStore((s) => s.showArchived);
  const sort = useUiStore((s) => s.listSort);
  const filters = useUiStore((s) => s.listFilters);
  const setSort = useUiStore((s) => s.setListSort);
  const reset = useUiStore((s) => s.resetListControls);

  const total = useMemo(
    () =>
      Object.values(todos).filter((t) =>
        matchesSearch(t, search, activeTag, showArchived)
      ).length,
    [todos, search, activeTag, showArchived]
  );

  const list = useMemo(() => {
    return Object.values(todos)
      .filter((t) => matchesSearch(t, search, activeTag, showArchived))
      .filter((t) => matchesListFilters(t, filters))
      .sort((a, b) => compareTodos(a, b, sort.field, sort.dir));
  }, [todos, search, activeTag, showArchived, filters, sort]);

  const filtered = hasActiveFilters(filters);

  if (total === 0) {
    return (
      <div className="list-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            没有匹配的事项。<br />
            点击左侧「新建事项」开始记录你的第一个待办。
          </div>
        </div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="list-wrapper">
        <ListToolbar total={total} shown={0} />
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">
            当前筛选条件下没有事项。
          </div>
          <button type="button" className="btn btn-primary empty-action" onClick={reset}>
            清除筛选/排序
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-wrapper">
      <ListToolbar total={total} shown={list.length} />
      <div className="todo-list">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const isSorted = sort.field === col.key;
                return (
                  <th
                    key={col.key}
                    className={cx('sortable', isSorted && 'is-sorted')}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && setSort(col.key)}
                    title={col.sortable ? '点击排序' : undefined}
                  >
                    {col.label}
                    {col.sortable && (
                      <span className="sort-arrow">
                        {isSorted ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </th>
                );
              })}
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
                  <td style={{ fontSize: 12 }}>{PRIORITY_LABELS[t.priority]}</td>
                  <td>
                    <div className="list-progress">
                      <div
                        className="list-progress-bar"
                        style={{
                          width: `${t.progress}%`,
                          background:
                            t.progress >= 100 ? 'var(--success)' : 'var(--accent)'
                        }}
                      />
                    </div>
                    <span className="list-progress-val">{t.progress}%</span>
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
        {filtered && (
          <div className="list-footer-hint">筛选后 {list.length} / 共 {total} 条</div>
        )}
      </div>
    </div>
  );
}
