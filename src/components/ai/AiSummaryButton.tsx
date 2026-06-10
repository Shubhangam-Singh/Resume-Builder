"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateSummary } from "@/lib/ai/summary";
import { selectActiveKey, selectActiveModel, useAiStore } from "@/lib/ai/store";
import { useResumeStore } from "@/lib/store";

/**
 * One-click AI professional summary generator. Renders nothing until the user
 * has saved an API key, keeping the AI feature opt-in by default.
 */
export function AiSummaryButton() {
  const provider = useAiStore((s) => s.provider);
  const apiKey   = useAiStore(selectActiveKey);
  const model    = useAiStore(selectActiveModel);
  const resume   = useResumeStore((s) => s.resume);
  const updateBasics = useResumeStore((s) => s.updateBasics);
  const [busy, setBusy] = useState(false);

  if (!apiKey) return null;

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const summary = await generateSummary(resume, { provider, apiKey, model });
      if (summary) updateBasics({ summary });
    } catch (err) {
      alert(err instanceof Error ? err.message : "AI request failed.");
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
      disabled={busy}
      title="Generate a professional summary with AI"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {busy ? "Generating…" : "Generate with AI"}
    </Button>
  );
}
