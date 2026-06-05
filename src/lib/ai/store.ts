import { create } from "zustand";

/**
 * Multi-provider AI bullet helper — bring-your-own-key.
 * Supports Anthropic (Claude), OpenAI (GPT), and Google Gemini.
 * Each provider stores its key and model separately in localStorage so the user
 * doesn't lose a working key when switching providers.
 * Nothing is ever sent to our servers — keys go directly to the chosen provider.
 */

export type AiProvider = "anthropic" | "openai" | "gemini";

// ── Per-provider metadata ──────────────────────────────────────────────────

export interface ProviderMeta {
  id: AiProvider;
  label: string;
  keyPlaceholder: string;
  docsUrl: string;
  docsLabel: string;
  freeNote?: string;
  models: { id: string; label: string }[];
  defaultModel: string;
}

export const AI_PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keyPlaceholder: "sk-ant-…",
    docsUrl: "https://console.anthropic.com",
    docsLabel: "console.anthropic.com",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — fast & cheap" },
      { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6 — higher quality" },
    ],
    defaultModel: "claude-haiku-4-5-20251001",
  },
  {
    id: "openai",
    label: "OpenAI",
    keyPlaceholder: "sk-…",
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: "platform.openai.com",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini — fast & cheap" },
      { id: "gpt-4o",      label: "GPT-4o — higher quality" },
    ],
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keyPlaceholder: "AIza…",
    docsUrl: "https://aistudio.google.com/apikey",
    docsLabel: "aistudio.google.com",
    freeNote: "Free tier available in AI Studio.",
    models: [
      { id: "gemini-2.0-flash",      label: "Gemini 2.0 Flash — fast & free tier" },
      { id: "gemini-1.5-pro",        label: "Gemini 1.5 Pro — higher quality" },
    ],
    defaultModel: "gemini-2.0-flash",
  },
];

export function getProviderMeta(id: AiProvider): ProviderMeta {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

// ── localStorage helpers ───────────────────────────────────────────────────

const STORAGE_PROVIDER = "resumeforge-ai-provider";
const KEY_PREFIX  = "resumeforge-ai-key-";   // + provider id
const MODEL_PREFIX = "resumeforge-ai-model-"; // + provider id

// Legacy keys for backward compat — existing Anthropic users keep their key.
const LEGACY_KEY   = "resumeforge-anthropic-key";
const LEGACY_MODEL = "resumeforge-anthropic-model";

function read(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function readKey(provider: AiProvider): string {
  if (provider === "anthropic") {
    // Prefer the new namespaced key, fall back to the legacy key so existing
    // Anthropic users don't need to re-enter their key.
    return read(KEY_PREFIX + provider, read(LEGACY_KEY, ""));
  }
  return read(KEY_PREFIX + provider, "");
}

function readModel(provider: AiProvider): string {
  const meta = getProviderMeta(provider);
  if (provider === "anthropic") {
    return read(MODEL_PREFIX + provider, read(LEGACY_MODEL, meta.defaultModel));
  }
  return read(MODEL_PREFIX + provider, meta.defaultModel);
}

// ── Store ──────────────────────────────────────────────────────────────────

interface AiStore {
  provider: AiProvider;
  keys:   Record<AiProvider, string>;
  models: Record<AiProvider, string>;

  setProvider: (p: AiProvider) => void;
  setKey:   (key: string) => void;   // sets key for the active provider
  clearKey: ()            => void;   // clears key for the active provider
  setModel: (model: string) => void; // sets model for the active provider
}

export const useAiStore = create<AiStore>((set, get) => ({
  provider: (read(STORAGE_PROVIDER, "anthropic") as AiProvider),
  keys: {
    anthropic: readKey("anthropic"),
    openai:    readKey("openai"),
    gemini:    readKey("gemini"),
  },
  models: {
    anthropic: readModel("anthropic"),
    openai:    readModel("openai"),
    gemini:    readModel("gemini"),
  },

  setProvider: (p) => {
    write(STORAGE_PROVIDER, p);
    set({ provider: p });
  },

  setKey: (key) => {
    const { provider, keys } = get();
    write(KEY_PREFIX + provider, key);
    set({ keys: { ...keys, [provider]: key } });
  },

  clearKey: () => {
    const { provider, keys } = get();
    remove(KEY_PREFIX + provider);
    if (provider === "anthropic") remove(LEGACY_KEY); // also wipe legacy
    set({ keys: { ...keys, [provider]: "" } });
  },

  setModel: (model) => {
    const { provider, models } = get();
    write(MODEL_PREFIX + provider, model);
    set({ models: { ...models, [provider]: model } });
  },
}));

// ── Convenience selectors ──────────────────────────────────────────────────

/** The API key saved for the currently selected provider. */
export const selectActiveKey   = (s: AiStore) => s.keys[s.provider];
/** The model selected for the currently selected provider. */
export const selectActiveModel = (s: AiStore) => s.models[s.provider];
/** True when the active provider has a non-empty API key. */
export const selectHasKey      = (s: AiStore) => !!s.keys[s.provider];
