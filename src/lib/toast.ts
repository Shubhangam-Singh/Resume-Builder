import { create } from "zustand";

/**
 * Minimal toast notifications replacing browser alert() popups. Call
 * `toast("message", "error")` from anywhere (React or not); the <Toaster />
 * mounted in Workspace renders the stack and each toast auto-dismisses.
 */

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, tone: ToastTone) => void;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 4000;
let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone: ToastTone = "info"): void {
  useToastStore.getState().push(message, tone);
}
