import { create } from "zustand";

import {
  emptyCertificate,
  emptyEducation,
  emptyProfile,
  emptyProject,
  emptyResume,
  emptySkill,
  emptyWork,
  sampleResume,
} from "./resume/factory";
import type {
  ArraySectionKey,
  Basics,
  CertificateEntry,
  EducationEntry,
  Location,
  Profile,
  ProjectEntry,
  ResumeData,
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

interface ResumeStore {
  resume: ResumeData;

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

  // meta
  setTemplate: (template: string) => void;

  // whole-document
  setResume: (resume: ResumeData) => void;
  resetResume: () => void;
  loadSample: () => void;
}

export const useResumeStore = create<ResumeStore>((set) => {
  /** Deep-clone, apply a mutation, and stamp lastModified. */
  const mutate = (fn: (r: ResumeData) => void) =>
    set((state) => {
      const resume = structuredClone(state.resume);
      fn(resume);
      resume.meta.lastModified = new Date().toISOString();
      return { resume };
    });

  return {
    resume: sampleResume(),

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

    setTemplate: (template) =>
      mutate((r) => {
        r.meta.template = template;
      }),

    setResume: (resume) =>
      set({
        resume: {
          ...resume,
          meta: { ...resume.meta, lastModified: new Date().toISOString() },
        },
      }),

    resetResume: () => set({ resume: emptyResume() }),
    loadSample: () => set({ resume: sampleResume() }),
  };
});
