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
      data-rf-intro
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-all duration-500 ease-out",
        phase === "hiding"
          ? "pointer-events-none scale-[1.03] opacity-0"
          : "scale-100 opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Mark, with a soft breathing halo behind it */}
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-2xl bg-primary/40 blur-xl"
            style={{ animation: "rf-intro-glow 2.4s ease-in-out infinite" }}
          />
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
            style={{
              animation: "rf-intro-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <FileText className="h-8 w-8" />
          </div>
        </div>

        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ animation: "rf-intro-rise 0.5s ease-out 0.18s both" }}
          >
            ResumeForge
          </h1>
          <p
            className="mt-1 text-sm text-muted-foreground"
            style={{ animation: "rf-intro-rise 0.5s ease-out 0.3s both" }}
          >
            Free, private, ATS-friendly resume builder
          </p>
        </div>

        <div
          className="relative mt-2 h-1 w-40 overflow-hidden rounded-full bg-muted"
          style={{ animation: "rf-intro-rise 0.5s ease-out 0.42s both" }}
        >
          <div
            className="h-full w-full bg-primary"
            style={{
              transformOrigin: "left",
              animation: "rf-intro-bar 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            }}
          />
          {/* Sheen sweeping along the filled bar */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            style={{ animation: "rf-intro-sheen 1.4s ease-in-out 0.5s infinite" }}
          />
        </div>

        <p
          className="mt-1 text-[11px] text-muted-foreground/60"
          style={{ animation: "rf-intro-rise 0.5s ease-out 0.54s both" }}
        >
          by Shubhangam Singh
        </p>
      </div>
    </div>
  );
}
