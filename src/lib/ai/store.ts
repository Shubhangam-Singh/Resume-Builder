import { create } from "zustand";

/**
 * Optional AI bullet helper — bring-your-own-key. The key lives only in the
 * user's browser (localStorage) and is sent directly to Anthropic when they use
 * the feature; it never touches any server of ours. Off until a key is entered.
 */

const KEY_STORAGE = "resumeforge-anthropic-key";
const MODEL_STORAGE = "resumeforge-anthropic-model";

export const AI_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — fast & cheap" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — higher quality" },
];
export const DEFAULT_MODEL = AI_MODELS[0].id;

function read(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore storage failures */
  }
}

interface AiStore {
  apiKey: string;
  model: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  setModel: (model: string) => void;
}

export const useAiStore = create<AiStore>((set) => ({
  apiKey: read(KEY_STORAGE, ""),
  model: read(MODEL_STORAGE, DEFAULT_MODEL),
  setApiKey: (key) => {
    write(KEY_STORAGE, key);
    set({ apiKey: key });
  },
  clearApiKey: () => {
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
    set({ apiKey: "" });
  },
  setModel: (model) => {
    write(MODEL_STORAGE, model);
    set({ model });
  },
}));
