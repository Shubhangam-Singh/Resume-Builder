"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A light branded intro shown briefly on open, then fades out to reveal the app.
 * Tap/click to skip. Kept short (~2.2s) and overlays everything (incl. the
 * hydration loader), so by the time it fades the editor is usually ready.
 */
export function IntroSplash() {
  const [phase, setPhase] = useState<"show" | "hiding" | "done">("show");

  useEffect(() => {
    const hide = setTimeout(() => setPhase("hiding"), 2200);
    const done = setTimeout(() => setPhase("done"), 2700);
    return () => {
      clearTimeout(hide);
      clearTimeout(done);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      onClick={() => setPhase("hiding")}
      role="presentation"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        phase === "hiding" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-4 duration-700 animate-in fade-in zoom-in-95">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <FileText className="h-8 w-8" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">ResumeForge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Free, private, ATS-friendly resume builder
          </p>
        </div>
        <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-full bg-primary"
            style={{
              transformOrigin: "left",
              animation: "rf-intro-bar 2.2s ease-out forwards",
            }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          by Shubhangam Singh
        </p>
      </div>
    </div>
  );
}
