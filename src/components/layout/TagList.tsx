import { useMemo } from 'react';
import { useTodoStore } from '../../store/useTodoStore';
import { useUiStore } from '../../store/useUiStore';
import { cx } from '../../lib/classnames';

export function TagList() {
  const todos = useTodoStore((s) => s.todos);
  const activeTag = useUiStore((s) => s.activeTag);
  const setActiveTag = useUiStore((s) => s.setActiveTag);

  const tags = useMemo(() => {
    const counter = new Map<string, number>();
    for (const t of Object.values(todos)) {
      if (t.status === 'archived') continue;
      for (const tag of t.tags) counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
    return [...counter.entries()].sort((a, b) => b[1] - a[1]);
  }, [todos]);

  return (
    <div className="tag-list">
      <div className="sidebar-section-title">标签</div>
      <button
        className={cx('tag-item', activeTag === null && 'tag-item-active')}
        onClick={() => setActiveTag(null)}
      >
        <span>全部</span>
      </button>
      {tags.map(([tag, count]) => (
        <button
          key={tag}
          className={cx('tag-item', activeTag === tag && 'tag-item-active')}
          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
        >
          <span className="tag-dot" />
          <span className="tag-name">{tag}</span>
          <span className="tag-count">{count}</span>
        </button>
      ))}
    </div>
  );
}
