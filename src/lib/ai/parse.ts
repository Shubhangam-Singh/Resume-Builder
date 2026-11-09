import type { ParseResult } from "@/lib/parser";
import { parseResumeJson } from "@/lib/persist/json";
import { chatComplete } from "./client";
import type { AiProvider } from "./store";

/**
 * AI-powered résumé parsing: ask the model to turn raw résumé text into our
 * JSON shape, then reuse the tolerant JSON coercion (regenerates ids, fills
 * defaults) so the result plugs into the same "Review what we imported" flow.
 */

const SYSTEM_PROMPT = `You convert a résumé into strict JSON. Output ONLY a single JSON object — no prose, no markdown fences.

Use exactly this shape (omit nothing; use "" or [] when unknown):
{
  "basics": {
    "name": "", "label": "", "email": "", "phone": "", "url": "",
    "location": { "city": "", "region": "", "countryCode": "" },
    "summary": "",
    "profiles": [ { "network": "", "username": "", "url": "" } ]
  },
  "work": [ { "name": "", "position": "", "location": "", "url": "", "startDate": "", "endDate": "", "summary": "", "highlights": [] } ],
  "education": [ { "institution": "", "area": "", "studyType": "", "startDate": "", "endDate": "", "score": "", "courses": [] } ],
  "projects": [ { "name": "", "description": "", "url": "", "keywords": [], "highlights": [] } ],
  "skills": [ { "name": "", "keywords": [] } ],
  "certificates": [ { "name": "", "issuer": "", "date": "", "url": "" } ]
}

Rules:
- "name" in work is the company/employer; "position" is the job title.
- Dates are "YYYY-MM" (or "YYYY" if only a year is known). Use "" for endDate if the role is current/ongoing.
- Put each résumé bullet as a separate string in "highlights". Do not merge bullets.
- Group skills into categories: "name" is the category (e.g. "Languages") and "keywords" the items. If the résumé lists skills without categories, use a single entry with "name": "Skills".
- "label" is the headline/title under the name (e.g. "Senior Software Engineer").
- Preserve the candidate's real wording and numbers. Never invent experience, employers, dates, or metrics that aren't in the text.`;

/** Pull the first balanced-looking JSON object out of a model response. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}

export interface AiParseOptions {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export async function parseResumeWithAi(
  resumeText: string,
  { provider, apiKey, model }: AiParseOptions,
): Promise<ParseResult> {
  const raw = await chatComplete(
    provider,
    { apiKey, model },
    SYSTEM_PROMPT,
    `Résumé text:\n\n${resumeText}`,
    4096,
  );

  const json = extractJsonObject(raw);
  if (!json) throw new Error("The AI didn't return readable JSON. Please retry.");

  // Reuse the import coercion: validates fields and regenerates entry ids.
  const data = parseResumeJson(json);

  const skills = data.skills.reduce((n, s) => n + s.keywords.length, 0);
  const found = {
    name: !!data.basics.name,
    email: !!data.basics.email,
    phone: !!data.basics.phone,
    summary: !!data.basics.summary,
    work: data.work.length,
    education: data.education.length,
    projects: data.projects.length,
    certificates: data.certificates.length,
    skills,
    custom: data.customSections?.length ?? 0,
  };
  const isEmpty =
    !found.name &&
    !found.email &&
    !found.phone &&
    !found.summary &&
    found.work === 0 &&
    found.education === 0 &&
    found.projects === 0 &&
    found.certificates === 0 &&
    skills === 0;

  return { data, found, isEmpty };
}
