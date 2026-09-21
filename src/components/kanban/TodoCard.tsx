import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '../../types/todo';
import { STATUS_LABELS } from '../../types/todo';
import { cx } from '../../lib/classnames';
import { formatDate, isOverdue } from '../../lib/date';

interface Props {
  todo: Todo;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function StatusIcon({ status }: { status: Todo['status'] }) {
  const icon = status === 'done' ? '✓' : status === 'cancelled' ? '✕' : status === 'in-progress' ? '●' : '';
  return (
    <span className={cx('todo-status-icon', `status-${status}`)} title={STATUS_LABELS[status]}>
      {icon}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Todo['priority'] }) {
  return <span className={cx('priority-dot', `p-${priority}`)} title={priority} />;
}

export function TodoCard({ todo, selected, onClick, onDoubleClick, onContextMenu }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: { quadrant: todo.quadrant }
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const overdue = isOverdue(todo.due, todo.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        'todo-card',
        `status-${todo.status}`,
        isDragging && 'is-dragging',
        selected && 'selected'
      )}
      data-status={todo.status}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      {...listeners}
      {...attributes}
    >
      <div className="todo-title">
        <StatusIcon status={todo.status} /> {todo.title}
      </div>
      {todo.progress > 0 && (
        <div className="todo-progress">
          <div
            className={cx('todo-progress-bar', todo.progress >= 100 && 'full')}
            style={{ width: `${todo.progress}%` }}
          />
        </div>
      )}
      <div className="todo-meta">
        <PriorityDot priority={todo.priority} />
        <span className="todo-meta-item">{todo.progress}%</span>
        {todo.due && (
          <span className={cx('todo-meta-item', overdue && 'overdue')}>
            📅 {formatDate(todo.due)}
          </span>
        )}
      </div>
      {todo.tags.length > 0 && (
        <div className="todo-tags">
          {todo.tags.map((t) => (
            <span key={t} className="todo-tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
