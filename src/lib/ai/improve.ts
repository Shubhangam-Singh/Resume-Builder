/**
 * Calls the Anthropic Messages API directly from the browser using the user's
 * own key (the `anthropic-dangerous-direct-browser-access` header enables CORS).
 * No backend, no key of ours — consistent with the app's privacy promise.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are an expert resume editor. Rewrite each bullet point to be concise, results-oriented, and ATS-friendly:
- Start with a strong past-tense action verb and cut filler words.
- Keep each bullet to a single line.
- Where a metric would strengthen the point but none is provided, add a bracketed placeholder like "[X%]", "[$Y]", or "[N]" instead of inventing a number.
- Never fabricate employers, job titles, technologies, dates, or specific figures. Preserve the original meaning and any real numbers already present.
Return ONLY a JSON array of strings — one rewritten bullet per input bullet, in the same order and the same count. No prose, no markdown.`;

interface ImproveOptions {
  apiKey: string;
  model: string;
}

function extractText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) =>
      block && typeof block === "object" && "text" in block
        ? String((block as { text?: unknown }).text ?? "")
        : "",
    )
    .join("");
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

async function errorMessage(res: Response): Promise<string> {
  if (res.status === 401) return "Invalid API key — check it in AI settings.";
  if (res.status === 429) return "Rate limited by Anthropic — try again shortly.";
  try {
    const body: unknown = await res.json();
    const msg =
      body && typeof body === "object"
        ? (body as { error?: { message?: string } }).error?.message
        : undefined;
    return msg ? `Anthropic API error: ${msg}` : `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

/** Rewrite each bullet. Returns improved bullets aligned 1:1 with the input. */
export async function improveBullets(
  bullets: string[],
  context: string,
  { apiKey, model }: ImproveOptions,
): Promise<string[]> {
  const userPrompt = `${context ? `Context: ${context}\n\n` : ""}Improve these ${bullets.length} resume bullet point(s). Return a JSON array of exactly ${bullets.length} string(s).\n\n${bullets
    .map((b, i) => `${i + 1}. ${b}`)
    .join("\n")}`;

  const res = await fetch(ANTHROPIC_URL, {
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
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(await errorMessage(res));

  const improved = parseJsonArray(extractText(await res.json()));
  if (!improved) throw new Error("Could not read the AI response. Please retry.");

  // Align length defensively: keep originals for any the model dropped.
  if (improved.length === bullets.length) return improved;
  return bullets.map((b, i) => improved[i] ?? b);
}
