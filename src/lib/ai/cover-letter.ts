/**
 * AI-powered cover letter generator.
 * Builds a prompt from the resume + a pasted job description and asks the
 * model for a complete, ready-to-edit letter. Same BYOK, no-backend pattern
 * as improve.ts — the browser talks straight to the chosen provider.
 */

import type { ResumeData } from "@/lib/resume/types";
import type { ImproveOptions } from "./improve";

const SYSTEM =
  `You are an expert career coach who writes compelling, honest cover letters.
Write a complete cover letter body for the candidate below, tailored to the job description:
- 3-4 short paragraphs, 250-350 words total.
- Open by naming the role (and company, if the job description states one) and a one-line hook tying the candidate's strongest qualification to it.
- Middle paragraphs: connect 2-3 concrete achievements or skills from the resume to the job's stated requirements. Use only facts present in the resume — never invent employers, titles, dates, technologies, or numbers.
- Close with a brief, confident call to action.
- Plain text only: no markdown, no addresses/date header, no subject line. Start at the greeting ("Dear ...") and end after the sign-off with the candidate's name.
Return ONLY the letter text.`;

function buildPrompt(resume: ResumeData, jobDescription: string): string {
  const { basics, work, skills, education } = resume;
  const topSkills = skills
    .flatMap((s) => s.keywords)
    .slice(0, 15)
    .join(", ");
  const workLines = work
    .slice(0, 3)
    .map((w) => {
      const bullets = w.highlights.slice(0, 3).join(" | ");
      return `- ${w.position || "Role"} at ${w.name || "company"}: ${bullets || w.summary || ""}`;
    })
    .join("\n");
  const edu = education[0]
    ? `${education[0].studyType} ${education[0].area}, ${education[0].institution}`
    : "";
  return [
    `Candidate: ${basics.name || "the candidate"}`,
    basics.label && `Title: ${basics.label}`,
    basics.summary && `Summary: ${basics.summary}`,
    workLines && `Experience:\n${workLines}`,
    edu && `Education: ${edu}`,
    topSkills && `Skills: ${topSkills}`,
    `\nJob description:\n${jobDescription.trim()}`,
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
      max_tokens: 1024,
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
      max_tokens: 1024,
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
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}.`);
  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function generateCoverLetter(
  resume: ResumeData,
  jobDescription: string,
  { provider, apiKey, model }: ImproveOptions,
): Promise<string> {
  const prompt = buildPrompt(resume, jobDescription);
  switch (provider) {
    case "anthropic": return callAnthropic(prompt, { apiKey, model });
    case "openai":    return callOpenAI(prompt, { apiKey, model });
    case "gemini":    return callGemini(prompt, { apiKey, model });
  }
}
