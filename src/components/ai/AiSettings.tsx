"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

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
 * their own API key, and choose a model. Keys are stored per-provider in
 * localStorage and never touch our servers.
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

  // Sync draft when the dialog opens or the active provider switches.
  useEffect(() => {
    if (open) setDraft(keys[provider]);
  }, [open, provider, keys]);

  const meta = AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];

  function handleProviderChange(p: AiProvider) {
    setProvider(p);
    // draft will sync via the effect above
  }

  function save() {
    setKey(draft.trim());
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
            Bring your own API key. Keys are stored only in your browser and
            sent <strong>directly to the provider</strong> when you click
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

          {/* ── Model ── */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-model">Model</Label>
            <select
              id="ai-model"
              value={models[provider]}
              onChange={(e) => setModel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            Save key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
