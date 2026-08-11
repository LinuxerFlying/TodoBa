import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quadrant, Status, Priority } from '../types/todo';

type ViewMode = 'kanban' | 'list';

export type SortField =
  | 'smart'
  | 'title'
  | 'quadrant'
  | 'status'
  | 'priority'
  | 'progress'
  | 'due'
  | 'updated';

export type SortDir = 'asc' | 'desc';

export type FilterKey = 'quadrant' | 'status' | 'priority';

export interface ListFilters {
  quadrant: Quadrant[];
  status: Status[];
  priority: Priority[];
}

interface UiState {
  view: ViewMode;
  searchQuery: string;
  activeTag: string | null;
  showArchived: boolean;
  sidebarOpen: boolean;
  listSort: { field: SortField; dir: SortDir };
  listFilters: ListFilters;
  setView: (v: ViewMode) => void;
  setSearch: (q: string) => void;
  setActiveTag: (t: string | null) => void;
  toggleArchived: () => void;
  toggleSidebar: () => void;
  setListSort: (field: SortField) => void;
  setListFilter: <K extends FilterKey>(key: K, values: ListFilters[K]) => void;
  resetListControls: () => void;
}

const DEFAULT_SORT: { field: SortField; dir: SortDir } = { field: 'smart', dir: 'asc' };
const DEFAULT_FILTERS: ListFilters = { quadrant: [], status: [], priority: [] };

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      view: 'kanban',
      searchQuery: '',
      activeTag: null,
      showArchived: false,
      sidebarOpen: true,
      listSort: DEFAULT_SORT,
      listFilters: DEFAULT_FILTERS,
      setView: (v) => set({ view: v }),
      setSearch: (q) => set({ searchQuery: q }),
      setActiveTag: (t) => set({ activeTag: t }),
      toggleArchived: () => set((s) => ({ showArchived: !s.showArchived })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setListSort: (field) =>
        set((s) => {
          if (field === 'smart') return { listSort: { field: 'smart', dir: 'asc' } };
          if (s.listSort.field === field) {
            return { listSort: { field, dir: s.listSort.dir === 'asc' ? 'desc' : 'asc' } };
          }
          const defaultDesc: SortField[] = ['progress', 'due', 'updated'];
          return { listSort: { field, dir: defaultDesc.includes(field) ? 'desc' : 'asc' } };
        }),
      setListFilter: (key, values) =>
        set((s) => ({ listFilters: { ...s.listFilters, [key]: values } })),
      resetListControls: () => set({ listSort: DEFAULT_SORT, listFilters: DEFAULT_FILTERS })
    }),
    {
      name: 'todoba-ui',
      partialize: (s) => ({
        listSort: s.listSort,
        listFilters: s.listFilters,
        showArchived: s.showArchived
      })
    }
  )
);
