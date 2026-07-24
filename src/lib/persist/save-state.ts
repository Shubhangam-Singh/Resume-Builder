import { create } from "zustand";

/**
 * Autosave status, published by useResumePersistence and read by the header
 * indicator. Kept in its own store so the hook's return value (hydration flag)
 * stays unchanged and any component can show save state.
 */
export type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveStateStore {
  state: SaveState;
  /** When the last successful save landed (ms epoch), for "saved 2m ago". */
  savedAt: number | null;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
}

export const useSaveState = create<SaveStateStore>((set) => ({
  state: "idle",
  savedAt: null,
  markSaving: () => set({ state: "saving" }),
  markSaved: () => set({ state: "saved", savedAt: Date.now() }),
  markError: () => set({ state: "error" }),
}));
