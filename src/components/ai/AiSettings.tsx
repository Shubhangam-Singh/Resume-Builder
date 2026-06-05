"use client";

import { useEffect, useState } from "react";

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
import { AI_MODELS, useAiStore } from "@/lib/ai/store";

/**
 * Controlled settings dialog for the optional AI bullet helper. Opened from the
 * "More" menu; stores a bring-your-own Anthropic key locally.
 */
export function AiSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const apiKey = useAiStore((s) => s.apiKey);
  const model = useAiStore((s) => s.model);
  const setApiKey = useAiStore((s) => s.setApiKey);
  const clearApiKey = useAiStore((s) => s.clearApiKey);
  const setModel = useAiStore((s) => s.setModel);

  const [draft, setDraft] = useState(apiKey);

  useEffect(() => {
    if (open) setDraft(apiKey);
  }, [open, apiKey]);

  function save() {
    setApiKey(draft.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI bullet helper (optional)</DialogTitle>
          <DialogDescription>
            Bring your own Anthropic API key. It&apos;s stored only in your
            browser and sent <strong>directly to Anthropic</strong> when you
            click &ldquo;Improve with AI&rdquo; — never to us. Usage is billed by
            Anthropic to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ai-key">Anthropic API key</Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              value={draft}
              placeholder="sk-ant-…"
              onChange={(e) => setDraft(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get one at console.anthropic.com. Leave AI off by simply not
              setting a key.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-model">Model</Label>
            <select
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          {apiKey ? (
            <Button
              variant="ghost"
              onClick={() => {
                clearApiKey();
                onOpenChange(false);
              }}
            >
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
