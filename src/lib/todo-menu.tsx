import toast from 'react-hot-toast';
import type { MenuItem } from '../components/ui/ContextMenu';
import { useTodoStore } from '../store/useTodoStore';
import { useUiStore } from '../store/useUiStore';
import {
  QUADRANT_ORDER,
  QUADRANT_LABELS,
  STATUS_LABELS,
  type Quadrant,
  type Status,
  type Todo
} from '../types/todo';

const sep = (): MenuItem => ({ type: 'separator' });

export async function deleteTodoWithUndo(todo: Todo): Promise<void> {
  const backup = { ...todo };
  await useTodoStore.getState().remove(todo.id);
  toast(
    (t) => (
      <span>
        已删除「{backup.title}」
        <button
          style={{
            marginLeft: 10,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            border: 'none',
            padding: '3px 10px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
          onClick={() => {
            useTodoStore.getState().restore(backup);
            toast.dismiss(t.id);
            toast.success('已撤销删除');
          }}
        >
          撤销
        </button>
      </span>
    ),
    { duration: 5000 }
  );
}

async function duplicateTodo(todo: Todo) {
  const created = (await window.api.todos.create({
    title: todo.title + ' 副本',
    quadrant: todo.quadrant,
    status: todo.status === 'done' ? 'todo' : todo.status,
    priority: todo.priority,
    progress: todo.status === 'done' ? 0 : todo.progress,
    due: todo.due,
    tags: [...todo.tags],
    body: todo.body
  })) as Todo;
  const store = useTodoStore.getState();
  useTodoStore.setState({
    todos: { ...store.todos, [created.id]: created },
    selectedId: created.id
  });
  useUiStore.setState({ editorOpen: false });
  toast.success('已复制事项');
}

async function copyTitle(todo: Todo) {
  try {
    await navigator.clipboard.writeText(todo.title);
    toast.success('标题已复制');
  } catch {
    toast.error('复制失败');
  }
}

function editTodo(todo: Todo) {
  useTodoStore.getState().select(todo.id);
  useUiStore.setState({ editorOpen: true });
}

const STATUS_MENU_ORDER: Status[] = [
  'todo',
  'in-progress',
  'done',
  'cancelled',
  'archived'
];

function statusSubmenu(todo: Todo): MenuItem {
  return {
    label: '设置状态',
    icon: '🔄',
    submenu: STATUS_MENU_ORDER.map((s) => ({
      label: STATUS_LABELS[s],
      checked: todo.status === s,
      onClick: () => {
        useTodoStore.getState().update(todo.id, {
          status: s,
          progress: s === 'done' ? 100 : s === 'todo' ? 0 : todo.progress
        });
      }
    }))
  };
}

function quadrantSubmenu(todo: Todo): MenuItem {
  return {
    label: '移动象限',
    icon: '📐',
    submenu: QUADRANT_ORDER.map((q: Quadrant) => ({
      label: QUADRANT_LABELS[q].title,
      checked: todo.quadrant === q,
      onClick: () => useTodoStore.getState().update(todo.id, { quadrant: q })
    }))
  };
}

export function buildTodoMenuItems(todo: Todo): MenuItem[] {
  const isDone = todo.status === 'done';
  return [
    {
      label: '编辑',
      icon: '✏️',
      shortcut: '双击',
      onClick: () => editTodo(todo)
    },
    {
      label: isDone ? '标记为待办' : '标记完成',
      icon: isDone ? '↩️' : '✓',
      onClick: () =>
        useTodoStore.getState().update(todo.id, {
          status: isDone ? 'todo' : 'done',
          progress: isDone ? 0 : 100
        })
    },
    sep(),
    statusSubmenu(todo),
    quadrantSubmenu(todo),
    sep(),
    {
      label: '复制标题',
      icon: '📋',
      onClick: () => copyTitle(todo)
    },
    {
      label: '复制事项',
      icon: '⧉',
      onClick: () => duplicateTodo(todo)
    },
    {
      label: '归档',
      icon: '📦',
      disabled: todo.status === 'archived',
      onClick: () =>
        useTodoStore.getState().update(todo.id, { status: 'archived' })
    },
    sep(),
    {
      label: '删除',
      icon: '🗑',
      danger: true,
      onClick: () => deleteTodoWithUndo(todo)
    }
  ];
}
