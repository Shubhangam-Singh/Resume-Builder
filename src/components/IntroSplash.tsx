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

  // Timeline: the bar finishes filling at ~1.95s, then a short beat before the
  // splash lifts away at 2.3s — so the fill is always seen completing.
  useEffect(() => {
    const hide = setTimeout(() => setPhase("hiding"), 2300);
    const done = setTimeout(() => setPhase("done"), 2820);
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
      data-rf-intro
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-all duration-500 ease-out",
        phase === "hiding"
          ? "pointer-events-none scale-[1.03] opacity-0"
          : "scale-100 opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Mark, with a soft breathing halo behind it. `isolate` keeps the
            -z-10 halo inside this stacking context — without it the halo
            paints behind the splash's own background and never shows. */}
        <div className="relative isolate">
          <span
            aria-hidden="true"
            data-rf-decor
            className="absolute inset-0 -z-10 rounded-[28px] bg-primary/40 blur-xl"
            style={{ animation: "rf-intro-glow 2.4s ease-in-out infinite" }}
          />
          <div
            data-rf-motion
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            style={{
              animation: "rf-intro-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <FileText className="h-8 w-8" />
          </div>
        </div>

        <div className="text-center">
          <h1
            data-rf-motion
            className="text-2xl font-bold tracking-tight"
            style={{ animation: "rf-intro-rise 0.5s ease-out 0.18s both" }}
          >
            ResumeForge
          </h1>
          <p
            data-rf-motion
            className="mt-1 text-sm text-muted-foreground"
            style={{ animation: "rf-intro-rise 0.5s ease-out 0.3s both" }}
          >
            Free, private, ATS-friendly resume builder
          </p>
        </div>

        {/* Progress track. Fades in (no transform, so nothing can shift the
            fill), then the fill sweeps 0→100% and completes before the exit. */}
        <div
          data-rf-motion
          className="relative mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-muted"
          style={{ animation: "rf-intro-fade 0.4s ease-out 0.38s both" }}
        >
          <div
            className="h-full w-full rounded-full bg-primary"
            style={{
              transformOrigin: "left",
              animation:
                "rf-intro-bar 1.5s cubic-bezier(0.32, 0.72, 0.3, 1) 0.45s both",
            }}
          />
          {/* Sheen sweeping along the bar */}
          <span
            aria-hidden="true"
            data-rf-decor
            className="absolute inset-y-0 -left-1/4 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            style={{ animation: "rf-intro-sheen 1.3s ease-in-out 0.7s infinite" }}
          />
        </div>

        <p
          data-rf-motion
          className="mt-1 text-[11px] text-muted-foreground/60"
          style={{ animation: "rf-intro-rise 0.5s ease-out 0.54s both" }}
        >
          by Shubhangam Singh
        </p>
      </div>
    </div>
  );
}
