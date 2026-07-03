"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_PROVIDERS,
  type AiProvider,
  useAiStore,
} from "@/lib/ai/store";
import { cn } from "@/lib/utils";

/**
 * Controlled settings dialog for the optional AI bullet helper.
 * Lets the user pick a provider (Anthropic / OpenAI / Google Gemini), enter
 * their own API key, and choose a model.
 *
 * Security improvements:
 *  - "Session only" checkbox keeps the key in memory only (never written to
 *    localStorage). Good for shared/public computers.
 *  - Visible warning banner explains that saved keys are stored in plain text
 *    in the browser's localStorage.
 */
export function AiSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const provider    = useAiStore((s) => s.provider);
  const keys        = useAiStore((s) => s.keys);
  const models      = useAiStore((s) => s.models);
  const setProvider = useAiStore((s) => s.setProvider);
  const setKey      = useAiStore((s) => s.setKey);
  const clearKey    = useAiStore((s) => s.clearKey);
  const setModel    = useAiStore((s) => s.setModel);

  // Local draft for the key so edits don't immediately overwrite localStorage.
  const [draft, setDraft] = useState(keys[provider]);
  // When true the key will only be kept in memory for this session.
  const [sessionOnly, setSessionOnly] = useState(false);

  // Sync draft when the dialog opens or the active provider switches.
  useEffect(() => {
    if (open) {
      setDraft(keys[provider]);
      // If there is no persisted key for this provider assume they want
      // session-only (safer default when first entering a key).
      setSessionOnly(!keys[provider]);
    }
  }, [open, provider, keys]);

  const meta = AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];

  function handleProviderChange(p: AiProvider) {
    setProvider(p);
    // draft will sync via the effect above
  }

  function save() {
    const trimmed = draft.trim();
    if (sessionOnly) {
      // Keep only in Zustand memory — wipe any previously persisted key.
      clearKey();
      // Directly mutate the in-memory store without writing to localStorage.
      useAiStore.setState((s) => ({
        keys: { ...s.keys, [provider]: trimmed },
      }));
    } else {
      setKey(trimmed);
    }
    onOpenChange(false);
  }

  function handleRemove() {
    clearKey();
    setDraft("");
    onOpenChange(false);
  }

  const hasKey = !!keys[provider];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI bullet helper (optional)</DialogTitle>
          <DialogDescription>
            Bring your own API key. Keys are sent{" "}
            <strong>directly to the provider</strong> when you click
            &ldquo;Improve with AI&rdquo; — never to us. Usage is billed to
            your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Provider selector ── */}
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <div className="flex gap-1 rounded-lg border p-1">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    provider === p.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {p.label}
                  {/* Green dot if key already saved for this provider */}
                  {keys[p.id] ? (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* ── API Key ── */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-key">{meta.label} API key</Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              value={draft}
              placeholder={meta.keyPlaceholder}
              onChange={(e) => setDraft(e.target.value)}
            />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              Get one at{" "}
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2"
              >
                {meta.docsLabel}
                <ExternalLink className="h-3 w-3" />
              </a>
              {meta.freeNote ? (
                <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {meta.freeNote}
                </span>
              ) : null}
            </p>
          </div>

          {/* ── Session-only checkbox ── */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors hover:bg-accent/50">
            <input
              id="ai-session-only"
              type="checkbox"
              checked={sessionOnly}
              onChange={(e) => setSessionOnly(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">
                Session only (don&apos;t save to browser storage)
              </p>
              <p className="text-xs text-muted-foreground">
                Key is kept in memory and forgotten when you close this tab.
                Safer on shared or public computers.
              </p>
            </div>
          </label>

          {/* ── Security warning (shown only when NOT session-only) ── */}
          {!sessionOnly && draft.trim() && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Heads up:</strong> Your API key will be stored in plain
                text in this browser&apos;s localStorage. Do not use this
                feature on a shared or public device. Use{" "}
                <strong>&ldquo;Session only&rdquo;</strong> instead if you are
                not on your personal computer.
              </span>
            </div>
          )}

          {/* ── Model ── */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-model">Model</Label>
            <select
              id="ai-model"
              value={models[provider]}
              onChange={(e) => setModel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            >
              {meta.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          {hasKey ? (
            <Button variant="ghost" onClick={handleRemove}>
              Remove key
            </Button>
          ) : null}
          <Button onClick={save} disabled={!draft.trim()}>
            {sessionOnly ? "Use for this session" : "Save key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
