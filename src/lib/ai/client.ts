import type { AiProvider } from "./store";

/**
 * Generic single-turn chat completion that dispatches to the chosen provider,
 * called directly from the browser with the user's own key (no backend). Returns
 * the raw text content. Used by AI resume parsing; the bullet improver has its
 * own provider calls.
 */

interface CallOpts {
  apiKey: string;
  model: string;
}

export async function chatComplete(
  provider: AiProvider,
  opts: CallOpts,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  if (provider === "openai") return openai(opts, system, user, maxTokens);
  if (provider === "gemini") return gemini(opts, system, user, maxTokens);
  return anthropic(opts, system, user, maxTokens);
}

async function errorMessage(res: Response, name: string): Promise<string> {
  if (res.status === 401) return `Invalid ${name} API key — check it in AI settings.`;
  if (res.status === 429) return `Rate limited by ${name} — try again shortly.`;
  try {
    const body: unknown = await res.json();
    const msg = (body as { error?: { message?: string } })?.error?.message;
    return msg ? `${name}: ${msg}` : `${name} request failed (${res.status}).`;
  } catch {
    return `${name} request failed (${res.status}).`;
  }
}

async function anthropic(
  { apiKey, model }: CallOpts,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
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
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Anthropic"));
  const data: unknown = await res.json();
  const content = (data as { content?: { type: string; text?: string }[] }).content;
  return Array.isArray(content) ? content.map((b) => b.text ?? "").join("") : "";
}

async function openai(
  { apiKey, model }: CallOpts,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "OpenAI"));
  const data: unknown = await res.json();
  return (
    (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]
      ?.message?.content ?? ""
  );
}

async function gemini(
  { apiKey, model }: CallOpts,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Gemini"));
  const data: unknown = await res.json();
  return (
    (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  );
}
