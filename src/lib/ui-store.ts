import { create } from "zustand";

/**
 * Small cross-component UI state: which editor tab is active and which global
 * dialog (if any) should open. Lets the command palette drive navigation and
 * tools without threading callbacks through the component tree.
 */

export type EditorTab =
  | "basics"
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "certificates"
  | "custom";

/** Dialogs the palette can open. Their host components watch this key. */
export type GlobalDialog =
  | "palette"
  | "score"
  | "ats-check"
  | "share"
  | "version-history"
  | "apply-tracker"
  | "ai-settings"
  | "cover-letter"
  | "linkedin-import"
  | "role-samples"
  | "wizard"
  | "tailor"
  | null;

interface UiStore {
  editorTab: EditorTab;
  setEditorTab: (tab: EditorTab) => void;
  dialog: GlobalDialog;
  openDialog: (dialog: Exclude<GlobalDialog, null>) => void;
  closeDialog: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  editorTab: "basics",
  setEditorTab: (editorTab) => set({ editorTab }),
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
}));
