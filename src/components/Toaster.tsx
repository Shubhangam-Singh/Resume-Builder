"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useToastStore, type ToastTone } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <AlertCircle className="h-4 w-4 text-rose-500" />,
  info: <Info className="h-4 w-4 text-sky-500" />,
};

/** Bottom-right toast stack. Mounted once in Workspace. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-16 right-3 z-[60] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2 lg:bottom-4 lg:right-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-background/95 p-3 text-sm shadow-lg backdrop-blur",
            "animate-in slide-in-from-bottom-2 fade-in-0 duration-200",
          )}
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
          <span className="flex-1">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
            >
              {t.action.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
