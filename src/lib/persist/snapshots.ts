import { uid } from "@/lib/resume/factory";
import type { ResumeData } from "@/lib/resume/types";
import { getDb, KV_STORE } from "./db";

/**
 * Version history: point-in-time snapshots of a resume document, stored locally
 * under `snap:<docId>:<id>` keys. Users can save a snapshot, restore one, or
 * diff it against the current resume. Nothing leaves the device.
 */

export interface Snapshot {
  id: string;
  docId: string;
  label: string;
  createdAt: number;
  data: ResumeData;
}

const PREFIX = "snap:";
const key = (docId: string, id: string) => `${PREFIX}${docId}:${id}`;

export async function listSnapshots(docId: string): Promise<Snapshot[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const keys = await db.getAllKeys(KV_STORE);
    const mine = keys.filter(
      (k): k is string =>
        typeof k === "string" && k.startsWith(`${PREFIX}${docId}:`),
    );
    const snaps = (await Promise.all(
      mine.map((k) => db.get(KV_STORE, k)),
    )) as (Snapshot | undefined)[];
    return snaps
      .filter((s): s is Snapshot => !!s)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveSnapshot(
  docId: string,
  label: string,
  data: ResumeData,
): Promise<Snapshot | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const snap: Snapshot = {
      id: uid(),
      docId,
      label: label.trim() || new Date().toLocaleString(),
      createdAt: Date.now(),
      // Deep clone so later edits don't mutate the stored snapshot.
      data: structuredClone(data),
    };
    await db.put(KV_STORE, snap, key(docId, snap.id));
    return snap;
  } catch {
    return null;
  }
}

export async function deleteSnapshot(docId: string, id: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(KV_STORE, key(docId, id));
  } catch {
    /* ignore */
  }
}
