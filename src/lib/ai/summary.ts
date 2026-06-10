/**
 * AI-powered professional summary generator.
 * Builds a prompt from the resume's basics + work history and asks the
 * model for a 2-3 sentence summary. Same BYOK, no-backend pattern as improve.ts.
 */

import type { ResumeData } from "@/lib/resume/types";
import type { ImproveOptions } from "./improve";

const SYSTEM =
  `You are an expert resume writer. Write a concise, first-person-free professional summary (2-3 sentences max) that:
- Leads with the candidate's title/role and years of experience (if available).
- Highlights their strongest skills and domain.
- Is ATS-friendly, specific, and avoids clichés like "results-driven" or "team player".
Return ONLY the summary text — no quotes, no labels, no extra prose.`;

function buildPrompt(resume: ResumeData): string {
  const { basics, work, skills } = resume;
  const name = basics.name || "the candidate";
  const title = basics.label || "";
  const topSkills = skills.flatMap((s) => s.keywords).slice(0, 10).join(", ");
  const recentWork = work
    .slice(0, 2)
    .map((w) => `${w.position} at ${w.name}`)
    .join("; ");
  return [
    `Name: ${name}`,
    title && `Title: ${title}`,
    recentWork && `Recent experience: ${recentWork}`,
    topSkills && `Key skills: ${topSkills}`,
    basics.summary && `Current summary (improve or replace): ${basics.summary}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callAnthropic(
  prompt: string,
  { apiKey, model }: { apiKey: string; model: string },
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
      max_tokens: 256,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const msg = res.status === 401 ? "Invalid API key." : `Error ${res.status}.`;
    throw new Error(msg);
  }
  const data = await res.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text?.trim() ?? "";
}

async function callOpenAI(
  prompt: string,
  { apiKey, model }: { apiKey: string; model: string },
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}.`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callGemini(
  prompt: string,
  { apiKey, model }: { apiKey: string; model: string },
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 256 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}.`);
  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function generateSummary(
  resume: ResumeData,
  { provider, apiKey, model }: ImproveOptions,
): Promise<string> {
  const prompt = buildPrompt(resume);
  switch (provider) {
    case "anthropic": return callAnthropic(prompt, { apiKey, model });
    case "openai":    return callOpenAI(prompt, { apiKey, model });
    case "gemini":    return callGemini(prompt, { apiKey, model });
  }
}
