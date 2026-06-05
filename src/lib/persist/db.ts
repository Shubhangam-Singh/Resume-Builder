import { openDB, type IDBPDatabase } from "idb";

import type { ResumeData } from "@/lib/resume/types";

/**
 * IndexedDB persistence for autosaving resumes. Supports multiple documents,
 * each stored under a `doc:<id>` key, with the active document id under
 * `active-id`. Everything stays on the device — local persistence, not sync.
 */

const DB_NAME = "resumeforge";
const DB_VERSION = 1;
const STORE = "kv";

const ACTIVE_ID_KEY = "active-id";
const LEGACY_KEY = "active-resume"; // single-doc key from the first release
const docKey = (id: string) => `doc:${id}`;

export interface SavedDoc {
  id: string;
  name: string;
  updatedAt: number;
  data: ResumeData;
}

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

export async function listDocs(): Promise<SavedDoc[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const keys = await db.getAllKeys(STORE);
    const docKeys = keys.filter(
      (k): k is string => typeof k === "string" && k.startsWith("doc:"),
    );
    const docs = (await Promise.all(
      docKeys.map((k) => db.get(STORE, k)),
    )) as (SavedDoc | undefined)[];
    return docs
      .filter((d): d is SavedDoc => !!d)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function loadDoc(id: string): Promise<SavedDoc | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    return (await db.get(STORE, docKey(id))) ?? null;
  } catch {
    return null;
  }
}

export async function saveDoc(doc: SavedDoc): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE, doc, docKey(doc.id));
  } catch {
    // best-effort; never block editing on a storage failure
  }
}

export async function deleteDoc(id: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(STORE, docKey(id));
  } catch {
    /* ignore */
  }
}

export async function getActiveId(): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    return (await db.get(STORE, ACTIVE_ID_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function setActiveId(id: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE, id, ACTIVE_ID_KEY);
  } catch {
    /* ignore */
  }
}

/** Read (and clear) a resume saved under the original single-document key. */
export async function takeLegacyResume(): Promise<ResumeData | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const legacy = (await db.get(STORE, LEGACY_KEY)) ?? null;
    if (legacy) await db.delete(STORE, LEGACY_KEY);
    return legacy;
  } catch {
    return null;
  }
}
