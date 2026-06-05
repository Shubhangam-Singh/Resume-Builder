/**
 * Multi-provider AI bullet improver.
 * Dispatches to the correct provider based on the `provider` argument.
 * All calls go directly from the browser to the chosen API — no backend
 * relay — honouring the app's bring-your-own-key privacy promise.
 */

import type { AiProvider } from "./store";

// ── Shared ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert resume editor. Rewrite each bullet point to be concise, results-oriented, and ATS-friendly:
- Start with a strong past-tense action verb and cut filler words.
- Keep each bullet to a single line.
- Where a metric would strengthen the point but none is provided, add a bracketed placeholder like "[X%]", "[$Y]", or "[N]" instead of inventing a number.
- Never fabricate employers, job titles, technologies, dates, or specific figures. Preserve the original meaning and any real numbers already present.
Return ONLY a JSON array of strings — one rewritten bullet per input bullet, in the same order and the same count. No prose, no markdown.`;

function buildUserPrompt(bullets: string[], context: string): string {
  return `${context ? `Context: ${context}\n\n` : ""}Improve these ${bullets.length} resume bullet point(s). Return a JSON array of exactly ${bullets.length} string(s).\n\n${bullets
    .map((b, i) => `${i + 1}. ${b}`)
    .join("\n")}`;
}

function parseJsonArray(text: string): string[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    return parsed.map((x) => (typeof x === "string" ? x : String(x)));
  } catch {
    return null;
  }
}

/** Align length defensively: keep originals for any bullet the model dropped. */
function alignLength(improved: string[], originals: string[]): string[] {
  if (improved.length === originals.length) return improved;
  return originals.map((b, i) => improved[i] ?? b);
}

// ── Anthropic ──────────────────────────────────────────────────────────────

async function improveWithAnthropic(
  bullets: string[],
  context: string,
  { apiKey, model }: { apiKey: string; model: string },
): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(bullets, context) }],
    }),
  });

  if (!res.ok) throw new Error(await anthropicError(res));

  const data: unknown = await res.json();
  const content = (data as { content?: { type: string; text?: string }[] }).content;
  const text = Array.isArray(content)
    ? content.map((b) => b.text ?? "").join("")
    : "";

  const improved = parseJsonArray(text);
  if (!improved) throw new Error("Could not read the AI response. Please retry.");
  return alignLength(improved, bullets);
}

async function anthropicError(res: Response): Promise<string> {
  if (res.status === 401) return "Invalid API key — check it in AI settings.";
  if (res.status === 429) return "Rate limited by Anthropic — try again shortly.";
  try {
    const body: unknown = await res.json();
    const msg = (body as { error?: { message?: string } })?.error?.message;
    return msg ? `Anthropic: ${msg}` : `Anthropic request failed (${res.status}).`;
  } catch { return `Anthropic request failed (${res.status}).`; }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────

async function improveWithOpenAI(
  bullets: string[],
  context: string,
  { apiKey, model }: { apiKey: string; model: string },
): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: buildUserPrompt(bullets, context) },
      ],
    }),
  });

  if (!res.ok) throw new Error(await openaiError(res));

  const data: unknown = await res.json();
  const text: string =
    (data as { choices?: { message?: { content?: string } }[] })
      .choices?.[0]?.message?.content ?? "";

  const improved = parseJsonArray(text);
  if (!improved) throw new Error("Could not read the AI response. Please retry.");
  return alignLength(improved, bullets);
}

async function openaiError(res: Response): Promise<string> {
  if (res.status === 401) return "Invalid API key — check it in AI settings.";
  if (res.status === 429) return "Rate limited by OpenAI — try again shortly.";
  try {
    const body: unknown = await res.json();
    const msg = (body as { error?: { message?: string } })?.error?.message;
    return msg ? `OpenAI: ${msg}` : `OpenAI request failed (${res.status}).`;
  } catch { return `OpenAI request failed (${res.status}).`; }
}

// ── Google Gemini ──────────────────────────────────────────────────────────

async function improveWithGemini(
  bullets: string[],
  context: string,
  { apiKey, model }: { apiKey: string; model: string },
): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        { role: "user", parts: [{ text: buildUserPrompt(bullets, context) }] },
      ],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(await geminiError(res));

  const data: unknown = await res.json();
  const text: string =
    (data as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }).candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const improved = parseJsonArray(text);
  if (!improved) throw new Error("Could not read the AI response. Please retry.");
  return alignLength(improved, bullets);
}

async function geminiError(res: Response): Promise<string> {
  if (res.status === 400) return "Bad request — check your API key or model name.";
  if (res.status === 429) return "Rate limited by Google Gemini — try again shortly.";
  try {
    const body: unknown = await res.json();
    const msg = (body as { error?: { message?: string } })?.error?.message;
    return msg ? `Gemini: ${msg}` : `Gemini request failed (${res.status}).`;
  } catch { return `Gemini request failed (${res.status}).`; }
}

// ── Public dispatcher ──────────────────────────────────────────────────────

export interface ImproveOptions {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

/**
 * Rewrite each bullet point with the chosen AI provider. Returns improved
 * bullets aligned 1:1 with the input, defensively keeping originals for any
 * item the model might drop.
 */
export async function improveBullets(
  bullets: string[],
  context: string,
  { provider, apiKey, model }: ImproveOptions,
): Promise<string[]> {
  switch (provider) {
    case "anthropic":
      return improveWithAnthropic(bullets, context, { apiKey, model });
    case "openai":
      return improveWithOpenAI(bullets, context, { apiKey, model });
    case "gemini":
      return improveWithGemini(bullets, context, { apiKey, model });
  }
}
