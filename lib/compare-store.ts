import { create } from "zustand";

interface CompareState {
  snackIds: string[];
  toggleSnack: (id: string) => void;
  setSnack: (slot: 0 | 1, id: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  snackIds: [],
  toggleSnack: (id) =>
    set((state) => {
      if (state.snackIds.includes(id)) {
        return { snackIds: state.snackIds.filter((item) => item !== id) };
      }
      return { snackIds: [...state.snackIds.slice(-1), id] };
    }),
  setSnack: (slot, id) =>
    set((state) => {
      const next = [...state.snackIds];
      next[slot] = id;
      return { snackIds: next.filter(Boolean).slice(0, 2) };
    }),
  clear: () => set({ snackIds: [] }),
}));
