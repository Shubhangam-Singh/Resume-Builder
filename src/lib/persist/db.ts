import { openDB, type IDBPDatabase } from "idb";

import type { ResumeData } from "@/lib/resume/types";

/**
 * Tiny IndexedDB wrapper for autosaving the active résumé. Everything stays on
 * the device — this is local persistence, not a sync service.
 */

const DB_NAME = "resumeforge";
const DB_VERSION = 1;
const STORE = "kv";
const ACTIVE_KEY = "active-resume";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> | null {
  if (typeof indexedDB === "undefined") return null; // SSR / unsupported
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function loadResume(): Promise<ResumeData | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    return (await db.get(STORE, ACTIVE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveResume(resume: ResumeData): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE, resume, ACTIVE_KEY);
  } catch {
    // Persistence is best-effort; never block editing on a storage failure.
  }
}
