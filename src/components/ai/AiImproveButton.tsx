"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { improveBullets } from "@/lib/ai/improve";
import { selectActiveKey, selectActiveModel, useAiStore } from "@/lib/ai/store";
import { toast } from "@/lib/toast";

/**
 * "Improve with AI" affordance for a bullet list. Renders nothing until the user
 * has opted in by saving an API key, so the AI feature is off by default.
 */
export function AiImproveButton({
  bullets,
  context,
  onResult,
}: {
  bullets: string[];
  context: string;
  onResult: (improved: string[]) => void;
}) {
  const provider = useAiStore((s) => s.provider);
  const apiKey   = useAiStore(selectActiveKey);
  const model    = useAiStore(selectActiveModel);
  const [busy, setBusy] = useState(false);

  if (!apiKey) return null;

  const usable = bullets.filter((b) => b.trim().length > 0);

  async function run() {
    if (!usable.length || busy) return;
    setBusy(true);
    try {
      onResult(await improveBullets(usable, context, { provider, apiKey, model }));
    } catch (err) {
      toast(err instanceof Error ? err.message : "AI request failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-xs"
      onClick={run}
      disabled={busy || usable.length === 0}
      title="Rewrite these bullet points with AI"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {busy ? "Improving…" : "Improve with AI"}
    </Button>
  );
}
