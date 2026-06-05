"use client";

import { useEffect, useState } from "react";

import { uid } from "@/lib/resume/factory";
import { useResumeStore } from "@/lib/store";
import {
  getActiveId,
  listDocs,
  loadDoc,
  saveDoc,
  setActiveId,
  takeLegacyResume,
  type SavedDoc,
} from "./db";

/**
 * Restores the active saved document from IndexedDB on first load (migrating a
 * legacy single-document save if present), then autosaves the active document
 * (debounced) on every change. Returns `true` once hydration is complete.
 */
export function useResumePersistence(): boolean {
  const [hydrated, setHydrated] = useState(false);
  const resume = useResumeStore((s) => s.resume);
  const documentId = useResumeStore((s) => s.documentId);
  const documentName = useResumeStore((s) => s.documentName);
  const loadDocument = useResumeStore((s) => s.loadDocument);

  // Hydrate once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let docs = await listDocs();

        // Migrate a resume saved under the original single-document key.
        if (docs.length === 0) {
          const legacy = await takeLegacyResume();
          if (legacy) {
            const migrated: SavedDoc = {
              id: uid(),
              name: "My resume",
              updatedAt: Date.now(),
              data: legacy,
            };
            await saveDoc(migrated);
            await setActiveId(migrated.id);
            docs = [migrated];
          }
        }

        const activeId = await getActiveId();
        let doc = activeId ? await loadDoc(activeId) : null;
        if (!doc) doc = docs[0] ?? null;

        // Nothing saved yet — seed a first document from the current (sample) state.
        if (!doc) {
          doc = {
            id: uid(),
            name: "My resume",
            updatedAt: Date.now(),
            data: useResumeStore.getState().resume,
          };
          await saveDoc(doc);
        }

        if (active) {
          loadDocument({ id: doc.id, name: doc.name, data: doc.data });
          await setActiveId(doc.id);
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of the active document (after hydration only).
  useEffect(() => {
    if (!hydrated || !documentId) return;
    const handle = setTimeout(() => {
      void saveDoc({
        id: documentId,
        name: documentName,
        updatedAt: Date.now(),
        data: resume,
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [resume, documentName, documentId, hydrated]);

  return hydrated;
}
