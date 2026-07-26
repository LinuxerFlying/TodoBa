import { create } from 'zustand';
import type { Quadrant } from '../types/todo';

type ViewMode = 'kanban' | 'list';

interface UiState {
  view: ViewMode;
  searchQuery: string;
  activeTag: string | null;
  showArchived: boolean;
  sidebarOpen: boolean;
  setView: (v: ViewMode) => void;
  setSearch: (q: string) => void;
  setActiveTag: (t: string | null) => void;
  toggleArchived: () => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: 'kanban',
  searchQuery: '',
  activeTag: null,
  showArchived: false,
  sidebarOpen: true,
  setView: (v) => set({ view: v }),
  setSearch: (q) => set({ searchQuery: q }),
  setActiveTag: (t) => set({ activeTag: t }),
  toggleArchived: () => set((s) => ({ showArchived: !s.showArchived })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen }))
}));
