import { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { useState } from 'react';
import { QuadrantColumn } from './QuadrantColumn';
import { TodoCard } from './TodoCard';
import { useTodoStore } from '../../store/useTodoStore';
import { useUiStore } from '../../store/useUiStore';
import type { Quadrant, Todo } from '../../types/todo';
import { QUADRANT_ORDER } from '../../types/todo';

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

export function KanbanBoard() {
  const todos = useTodoStore((s) => s.todos);
  const selectedId = useTodoStore((s) => s.selectedId);
  const select = useTodoStore((s) => s.select);
  const update = useTodoStore((s) => s.update);
  const search = useUiStore((s) => s.searchQuery);
  const activeTag = useUiStore((s) => s.activeTag);
  const showArchived = useUiStore((s) => s.showArchived);
  const editorOpen = useUiStore((s) => s.editorOpen);
  const toggleEditor = useUiStore((s) => s.toggleEditor);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useMemo(() => {
    const g: Record<Quadrant, Todo[]> = { q1: [], q2: [], q3: [], q4: [] };
    for (const t of Object.values(todos)) {
      if (!matchesSearch(t, search, activeTag, showArchived)) continue;
      g[t.quadrant].push(t);
    }
    for (const q of QUADRANT_ORDER) {
      g[q].sort((a, b) => {
        // done last
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (b.status === 'done' && a.status !== 'done') return -1;
        // priority
        const ord: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const d = (ord[a.priority] ?? 9) - (ord[b.priority] ?? 9);
        if (d !== 0) return d;
        return b.updated.localeCompare(a.updated);
      });
    }
    return g;
  }, [todos, search, activeTag, showArchived]);

  const total = Object.values(grouped).reduce((n, arr) => n + arr.length, 0);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const targetQ = String(over.id) as Quadrant;
    const current = todos[id];
    if (!current) return;
    if (current.quadrant !== targetQ && QUADRANT_ORDER.includes(targetQ)) {
      update(id, { quadrant: targetQ });
    }
  };

  const activeTodo = activeId ? todos[activeId] : null;

  const handleCardDoubleClick = (id: string) => {
    select(id);
    if (!editorOpen) toggleEditor();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden' }}
      >
        <div
          className="kanban"
          onClick={(e) => {
            if (e.target === e.currentTarget) select(null);
          }}
        >
          {QUADRANT_ORDER.map((q) => (
            <QuadrantColumn
              key={q}
              q={q}
              todos={grouped[q]}
              selectedId={selectedId}
              onSelect={select}
              onDoubleClick={handleCardDoubleClick}
            />
          ))}
        </div>
        {total === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              background: 'var(--bg)'
            }}
          >
            <div className="empty-state" style={{ pointerEvents: 'auto' }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">
                没有匹配的事项。<br />
                点击左侧「新建事项」(Ctrl+N) 开始记录第一个待办。
              </div>
            </div>
          </div>
        )}
      </div>
      <DragOverlay>
        {activeTodo ? (
          <div className="drag-overlay">
            <TodoCard todo={activeTodo} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
