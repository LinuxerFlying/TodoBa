import { useDroppable } from '@dnd-kit/core';
import type { Quadrant, Todo } from '../../types/todo';
import { QUADRANT_LABELS } from '../../types/todo';
import { TodoCard } from './TodoCard';
import { cx } from '../../lib/classnames';

interface Props {
  q: Quadrant;
  todos: Todo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, todo: Todo) => void;
}

export function QuadrantColumn({ q, todos, selectedId, onSelect, onDoubleClick, onContextMenu }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: q });
  const info = QUADRANT_LABELS[q];

  return (
    <div
      ref={setNodeRef}
      className={cx('quadrant', isOver && 'is-over')}
      data-q={q}
    >
      <div className="quadrant-header">
        <span className="quadrant-title">{info.title}</span>
        <span className="quadrant-subtitle">{info.subtitle}</span>
        <span className="quadrant-count">{todos.length}</span>
      </div>
      <div className="quadrant-body">
        {todos.length === 0 ? (
          <div className="quadrant-empty">拖入或新建事项</div>
        ) : (
          todos.map((t) => (
            <TodoCard
              key={t.id}
              todo={t}
              selected={selectedId === t.id}
              onClick={() => onSelect(t.id)}
              onDoubleClick={onDoubleClick ? () => onDoubleClick(t.id) : undefined}
              onContextMenu={onContextMenu ? (e) => onContextMenu(e, t) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
