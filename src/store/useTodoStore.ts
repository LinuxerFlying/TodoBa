import { create } from 'zustand';
import type { Todo, Quadrant } from '../types/todo';

interface TodoState {
  todos: Record<string, Todo>;
  selectedId: string | null;
  loading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  create: (data?: Partial<Todo>) => Promise<Todo>;
  update: (id: string, patch: Partial<Todo>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  restore: (todo: Todo) => Promise<void>;
  select: (id: string | null) => void;
  reloadOne: (id: string) => Promise<void>;
  removeOne: (id: string) => void;
  upsertOne: (todo: Todo) => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: {},
  selectedId: null,
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const list = (await window.api.todos.list()) as Todo[];
      const map: Record<string, Todo> = {};
      for (const t of list) map[t.id] = t;
      set({ todos: map, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  create: async (data) => {
    const todo = (await window.api.todos.create(data || {})) as Todo;
    set((s) => ({ todos: { ...s.todos, [todo.id]: todo }, selectedId: todo.id }));
    return todo;
  },

  update: async (id, patch) => {
    // optimistic
    set((s) => {
      const cur = s.todos[id];
      if (!cur) return {};
      const next = { ...cur, ...patch, updated: new Date().toISOString() };
      return { todos: { ...s.todos, [id]: next } };
    });
    try {
      const updated = (await window.api.todos.update(id, patch)) as Todo;
      set((s) => ({ todos: { ...s.todos, [id]: updated } }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  remove: async (id) => {
    set((s) => {
      const { [id]: _gone, ...rest } = s.todos;
      return { todos: rest, selectedId: s.selectedId === id ? null : s.selectedId };
    });
    try {
      await window.api.todos.delete(id);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  restore: async (todo) => {
    await window.api.todos.create(todo);
    set((s) => ({ todos: { ...s.todos, [todo.id]: todo }, selectedId: todo.id }));
  },

  select: (id) => set({ selectedId: id }),

  reloadOne: async (id) => {
    try {
      const fresh = (await window.api.todos.read(id)) as Todo | null;
      if (fresh) {
        set((s) => ({ todos: { ...s.todos, [id]: fresh } }));
      } else {
        get().removeOne(id);
      }
    } catch {
      /* ignore */
    }
  },

  removeOne: (id) =>
    set((s) => {
      if (!s.todos[id]) return {};
      const { [id]: _g, ...rest } = s.todos;
      return { todos: rest, selectedId: s.selectedId === id ? null : s.selectedId };
    }),

  upsertOne: (todo) =>
    set((s) => ({ todos: { ...s.todos, [todo.id]: todo } }))
}));
