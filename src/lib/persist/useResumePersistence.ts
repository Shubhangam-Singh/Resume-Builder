"use client";

import { useEffect, useState } from "react";

import { useResumeStore } from "@/lib/store";
import { loadResume, saveResume } from "./db";

/**
 * Restores the saved résumé from IndexedDB on first load, then autosaves
 * (debounced) on every change. Returns `true` once hydration is complete so the
 * UI can avoid flashing the default sample before the saved data loads.
 */
export function useResumePersistence(): boolean {
  const [hydrated, setHydrated] = useState(false);
  const resume = useResumeStore((s) => s.resume);
  const setResume = useResumeStore((s) => s.setResume);

  // Hydrate once.
  useEffect(() => {
    let active = true;
    loadResume()
      .then((saved) => {
        if (active && saved) setResume(saved);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave (only after hydration, so we never overwrite saved data
  // with the initial sample before it has loaded).
  useEffect(() => {
    if (!hydrated) return;
    const handle = setTimeout(() => void saveResume(resume), 600);
    return () => clearTimeout(handle);
  }, [resume, hydrated]);

  return hydrated;
}
