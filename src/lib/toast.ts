import { create } from "zustand";

/**
 * Minimal toast notifications replacing browser alert() popups. Call
 * `toast("message", "error")` from anywhere (React or not); the <Toaster />
 * mounted in Workspace renders the stack and each toast auto-dismisses.
 */

export type ToastTone = "success" | "error" | "info";

/** Optional inline action, e.g. undoing a delete. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, tone: ToastTone, action?: ToastAction) => void;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 4000;
let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone, action) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone, action }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(
  message: string,
  tone: ToastTone = "info",
  action?: ToastAction,
): void {
  useToastStore.getState().push(message, tone, action);
}
