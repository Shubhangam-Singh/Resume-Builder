import { create } from "zustand";

import {
  emptyCertificate,
  emptyCustomItem,
  emptyCustomSection,
  emptyEducation,
  emptyProfile,
  emptyProject,
  emptyResume,
  emptySkill,
  emptyWork,
  sampleResume,
} from "./resume/factory";
import { customKey, resolveSectionOrder } from "./resume/sections";
import { DENSITY_PRESETS } from "./resume/theme";
import type {
  ArraySectionKey,
  Basics,
  CertificateEntry,
  CustomItem,
  CustomSection,
  DateFormat,
  EducationEntry,
  HighlightRule,
  Location,
  Profile,
  ProjectEntry,
  ResumeData,
  SectionKey,
  SkillEntry,
  WorkEntry,
} from "./resume/types";

/** Maps each array section to its element type, for typed CRUD signatures. */
type SectionElement = {
  work: WorkEntry;
  education: EducationEntry;
  projects: ProjectEntry;
  skills: SkillEntry;
  certificates: CertificateEntry;
};

const emptyFactories: { [K in ArraySectionKey]: () => SectionElement[K] } = {
  work: emptyWork,
  education: emptyEducation,
  projects: emptyProject,
  skills: emptySkill,
  certificates: emptyCertificate,
};

/** Undo/redo: how many past/future states to keep, and how long edits coalesce. */
const HISTORY_LIMIT = 60;
const COALESCE_MS = 600;

interface ResumeStore {
  resume: ResumeData;

  // undo/redo history (snapshots of past/future resume states)
  past: ResumeData[];
  future: ResumeData[];
  undo: () => void;
  redo: () => void;

  // active saved-document identity (for multiple resumes)
  documentId: string;
  documentName: string;
  loadDocument: (doc: { id: string; name: string; data: ResumeData }) => void;
  setDocumentName: (name: string) => void;

  // basics
  updateBasics: (patch: Partial<Basics>) => void;
  updateLocation: (patch: Partial<Location>) => void;

  // profiles (nested under basics)
  addProfile: () => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  removeProfile: (id: string) => void;

  // generic array-section CRUD
  addEntry: (section: ArraySectionKey) => void;
  updateEntry: <K extends ArraySectionKey>(
    section: K,
    id: string,
    patch: Partial<SectionElement[K]>,
  ) => void;
  removeEntry: (section: ArraySectionKey, id: string) => void;
  moveEntry: (section: ArraySectionKey, id: string, dir: -1 | 1) => void;

  // custom sections
  addCustomSection: (title?: string) => void;
  updateCustomSection: (id: string, patch: Partial<Omit<CustomSection, "items">>) => void;
  removeCustomSection: (id: string) => void;
  addCustomItem: (sectionId: string) => void;
  updateCustomItem: (
    sectionId: string,
    itemId: string,
    patch: Partial<CustomItem>,
  ) => void;
  removeCustomItem: (sectionId: string, itemId: string) => void;
  moveCustomItem: (sectionId: string, itemId: string, dir: -1 | 1) => void;

  // meta
  setTemplate: (template: string) => void;
  toggleSection: (section: SectionKey) => void;
  moveSection: (section: SectionKey, dir: -1 | 1) => void;
  setThemeColor: (color: string | undefined) => void;
  setDensity: (density: "compact" | "standard" | "loose") => void;
  setFontFamily: (fontFamily: string) => void;
  setFontScale: (value: number) => void;
  setLineSpacing: (value: number) => void;
  setSectionSpacing: (value: number) => void;
  setParagraphSpacing: (value: number) => void;
  setDateFormat: (value: DateFormat) => void;
  setHighlights: (highlights: HighlightRule[]) => void;

  // whole-document
  setResume: (resume: ResumeData) => void;
  resetResume: () => void;
  loadSample: () => void;
}

export const useResumeStore = create<ResumeStore>((set) => {
  // Timestamp of the last history snapshot, so a burst of rapid keystrokes
  // collapses into a single undo step instead of one-per-character.
  let lastSnapshotAt = 0;

  /** Deep-clone, apply a mutation, stamp lastModified, and record undo history. */
  const mutate = (fn: (r: ResumeData) => void) =>
    set((state) => {
      const resume = structuredClone(state.resume);
      fn(resume);
      resume.meta.lastModified = new Date().toISOString();

      const now = Date.now();
      let past = state.past;
      if (now - lastSnapshotAt > COALESCE_MS) {
        past = [...state.past, state.resume].slice(-HISTORY_LIMIT);
      }
      lastSnapshotAt = now;
      return { resume, past, future: [] };
    });

  /** Replace the whole resume as a single, undoable step (import / sample / clear). */
  const replace = (next: ResumeData) =>
    set((state) => {
      lastSnapshotAt = 0; // force the next edit to start a fresh undo step
      return {
        resume: next,
        past: [...state.past, state.resume].slice(-HISTORY_LIMIT),
        future: [],
      };
    });

  return {
    resume: sampleResume(),
    past: [],
    future: [],
    documentId: "",
    documentName: "My resume",

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return {};
        const previous = state.past[state.past.length - 1];
        lastSnapshotAt = 0;
        return {
          resume: previous,
          past: state.past.slice(0, -1),
          future: [state.resume, ...state.future].slice(0, HISTORY_LIMIT),
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return {};
        const next = state.future[0];
        lastSnapshotAt = 0;
        return {
          resume: next,
          past: [...state.past, state.resume].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
        };
      }),

    loadDocument: (doc) =>
      set({
        resume: doc.data,
        documentId: doc.id,
        documentName: doc.name,
        past: [],
        future: [],
      }),
    setDocumentName: (name) => set({ documentName: name }),

    updateBasics: (patch) =>
      mutate((r) => {
        r.basics = { ...r.basics, ...patch };
      }),

    updateLocation: (patch) =>
      mutate((r) => {
        r.basics.location = { ...r.basics.location, ...patch };
      }),

    addProfile: () =>
      mutate((r) => {
        r.basics.profiles.push(emptyProfile());
      }),

    updateProfile: (id, patch) =>
      mutate((r) => {
        const p = r.basics.profiles.find((x) => x.id === id);
        if (p) Object.assign(p, patch);
      }),

    removeProfile: (id) =>
      mutate((r) => {
        r.basics.profiles = r.basics.profiles.filter((x) => x.id !== id);
      }),

    addEntry: (section) =>
      mutate((r) => {
        (r[section] as { id: string }[]).push(emptyFactories[section]());
      }),

    updateEntry: (section, id, patch) =>
      mutate((r) => {
        const list = r[section] as { id: string }[];
        const item = list.find((x) => x.id === id);
        if (item) Object.assign(item, patch);
      }),

    removeEntry: (section, id) =>
      mutate((r) => {
        const list = r[section] as { id: string }[];
        const idx = list.findIndex((x) => x.id === id);
        if (idx >= 0) list.splice(idx, 1);
      }),

    moveEntry: (section, id, dir) =>
      mutate((r) => {
        const list = r[section] as { id: string }[];
        const i = list.findIndex((x) => x.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      }),

    // ---- custom sections --------------------------------------------------
    addCustomSection: (title) =>
      mutate((r) => {
        r.customSections = [...(r.customSections ?? []), emptyCustomSection(title)];
      }),

    updateCustomSection: (id, patch) =>
      mutate((r) => {
        const s = (r.customSections ?? []).find((x) => x.id === id);
        if (s) Object.assign(s, patch);
      }),

    removeCustomSection: (id) =>
      mutate((r) => {
        r.customSections = (r.customSections ?? []).filter((x) => x.id !== id);
        const key = customKey(id);
        if (r.meta.sectionOrder)
          r.meta.sectionOrder = r.meta.sectionOrder.filter((k) => k !== key);
        if (r.meta.hiddenSections)
          r.meta.hiddenSections = r.meta.hiddenSections.filter((k) => k !== key);
      }),

    addCustomItem: (sectionId) =>
      mutate((r) => {
        const s = (r.customSections ?? []).find((x) => x.id === sectionId);
        if (s) s.items.push(emptyCustomItem());
      }),

    updateCustomItem: (sectionId, itemId, patch) =>
      mutate((r) => {
        const s = (r.customSections ?? []).find((x) => x.id === sectionId);
        const item = s?.items.find((i) => i.id === itemId);
        if (item) Object.assign(item, patch);
      }),

    removeCustomItem: (sectionId, itemId) =>
      mutate((r) => {
        const s = (r.customSections ?? []).find((x) => x.id === sectionId);
        if (s) s.items = s.items.filter((i) => i.id !== itemId);
      }),

    moveCustomItem: (sectionId, itemId, dir) =>
      mutate((r) => {
        const s = (r.customSections ?? []).find((x) => x.id === sectionId);
        if (!s) return;
        const i = s.items.findIndex((x) => x.id === itemId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.items.length) return;
        [s.items[i], s.items[j]] = [s.items[j], s.items[i]];
      }),

    setTemplate: (template) =>
      mutate((r) => {
        r.meta.template = template;
      }),

    setThemeColor: (color) =>
      mutate((r) => {
        if (color) r.meta.themeColor = color;
        else delete r.meta.themeColor;
      }),

    setDensity: (density) =>
      mutate((r) => {
        r.meta.density = density;
        const p = DENSITY_PRESETS[density];
        r.meta.fontScale = p.fontScale;
        r.meta.lineSpacing = p.lineSpacing;
        r.meta.sectionSpacing = p.sectionSpacing;
        r.meta.paragraphSpacing = p.paragraphSpacing;
      }),

    setFontFamily: (fontFamily) =>
      mutate((r) => {
        r.meta.fontFamily = fontFamily;
      }),

    setFontScale: (value) =>
      mutate((r) => {
        r.meta.fontScale = value;
      }),

    // Moving a spacing slider switches the density preset to "custom" (cleared).
    setLineSpacing: (value) =>
      mutate((r) => {
        r.meta.lineSpacing = value;
        r.meta.density = undefined;
      }),

    setSectionSpacing: (value) =>
      mutate((r) => {
        r.meta.sectionSpacing = value;
        r.meta.density = undefined;
      }),

    setParagraphSpacing: (value) =>
      mutate((r) => {
        r.meta.paragraphSpacing = value;
        r.meta.density = undefined;
      }),

    setDateFormat: (value) =>
      mutate((r) => {
        r.meta.dateFormat = value;
      }),

    setHighlights: (highlights) =>
      mutate((r) => {
        r.meta.highlights = highlights;
      }),

    toggleSection: (section) =>
      mutate((r) => {
        const hidden = new Set(r.meta.hiddenSections ?? []);
        if (hidden.has(section)) hidden.delete(section);
        else hidden.add(section);
        r.meta.hiddenSections = [...hidden];
      }),

    moveSection: (section, dir) =>
      mutate((r) => {
        const order = resolveSectionOrder(r.meta, r.customSections ?? []);
        const i = order.indexOf(section);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        r.meta.sectionOrder = order;
      }),

    setResume: (resume) =>
      replace({
        ...resume,
        meta: { ...resume.meta, lastModified: new Date().toISOString() },
      }),

    resetResume: () => replace(emptyResume()),
    loadSample: () => replace(sampleResume()),
  };
});

/** Selectors for undo/redo availability (use in components). */
export const selectCanUndo = (s: ResumeStore) => s.past.length > 0;
export const selectCanRedo = (s: ResumeStore) => s.future.length > 0;
