import { matchKnownSkills } from "@/lib/parser/skills";

/**
 * Job-description keyword matching. Two sources of keywords:
 *   1. Known skills from the taxonomy mentioned in the JD (high signal).
 *   2. The most frequent meaningful words in the JD (catches role/domain terms
 *      the taxonomy doesn't know, e.g. "stakeholder", "roadmap").
 * Each keyword is then checked for presence in the resume text.
 */

// Common English + resume/JD boilerplate to exclude from keyword extraction.
const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "our", "with", "will", "are", "this",
  "that", "have", "has", "from", "they", "their", "them", "but", "not", "all",
  "any", "can", "may", "who", "what", "when", "where", "which", "how", "why",
  "into", "out", "off", "over", "under", "than", "then", "these", "those",
  "some", "such", "more", "most", "other", "about", "also", "able", "across",
  "work", "working", "experience", "experienced", "years", "year", "team",
  "teams", "role", "roles", "ability", "strong", "good", "great", "excellent",
  "including", "include", "includes", "etc", "using", "use", "used", "within",
  "must", "should", "would", "could", "well", "looking", "join", "help",
  "build", "building", "company", "companies", "business", "businesses",
  "opportunity", "candidate", "candidates", "responsibilities", "requirements",
  "required", "qualifications", "preferred", "plus", "knowledge", "skills",
  "skill", "understanding", "proficiency", "familiarity", "passion", "passionate",
  "self", "fast", "paced", "environment", "environments", "world", "class",
  "best", "new", "high", "quality", "deliver", "delivering", "drive", "driving",
  "ensure", "ensuring", "support", "supporting", "develop", "developing",
  "development", "design", "designing", "manage", "managing", "management",
  "lead", "leading", "leader", "leadership", "collaborate", "collaborating",
  "collaboration", "communicate", "communication", "communicating", "across",
  "various", "multiple", "related", "field", "fields", "degree", "bachelor",
  "master", "equivalent", "per", "day", "time", "full", "part", "based",
  "remote", "hybrid", "office", "position", "positions", "job", "apply",
  "we", "us", "is", "as", "an", "of", "to", "in", "on", "at", "or", "be",
  "it", "by", "a", "i",
]);

const TOKEN_RE = /[a-z][a-z0-9+#.\-]{1,}/g;

function normalizeToken(token: string): string {
  return token.replace(/[.\-]+$/, "");
}

/** Ranked candidate keywords from a job description. */
export function extractKeywords(text: string, limit = 28): string[] {
  const known = matchKnownSkills(text);

  const freq = new Map<string, number>();
  for (const raw of text.toLowerCase().match(TOKEN_RE) ?? []) {
    const w = normalizeToken(raw);
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const general = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  const seen = new Set<string>();
  const result: string[] = [];
  // Known skills first (they carry the most weight for ATS), then frequent terms.
  for (const k of known) {
    const lc = k.toLowerCase();
    if (!seen.has(lc)) {
      seen.add(lc);
      result.push(k);
    }
  }
  for (const g of general) {
    if (result.length >= limit) break;
    if (!seen.has(g)) {
      seen.add(g);
      result.push(g);
    }
  }
  return result.slice(0, limit);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Boundary-aware presence test that still works for "c++", "node.js", ".net". */
export function keywordPresent(term: string, haystackLower: string): boolean {
  const t = escapeRegExp(term.toLowerCase());
  return new RegExp(`(?<![a-z0-9])${t}(?![a-z0-9])`, "i").test(haystackLower);
}

export interface CoverageResult {
  results: { term: string; present: boolean }[];
  matched: number;
  total: number;
  coverage: number; // 0–100
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Split text into segments, marking the runs that match any of the given terms.
 * Used by the "tailored" view to highlight where a resume already covers a job
 * description's keywords. Boundary-aware so it still matches "c++", ".net", etc.
 */
export function highlightMatches(
  text: string,
  terms: string[],
): HighlightSegment[] {
  const cleaned = terms.filter(Boolean);
  if (!cleaned.length || !text) return [{ text, match: false }];
  // Longest first so multi-word terms win over their prefixes.
  const escaped = cleaned
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![a-z0-9])(${escaped.join("|")})(?![a-z0-9])`, "gi");

  const segs: HighlightSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), match: false });
    segs.push({ text: m[0], match: true });
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  if (last < text.length) segs.push({ text: text.slice(last), match: false });
  return segs;
}

/** Compare JD keywords against the resume text. */
export function analyzeCoverage(jd: string, resumeText: string): CoverageResult {
  const keywords = extractKeywords(jd);
  const hay = resumeText.toLowerCase();
  const results = keywords.map((term) => ({
    term,
    present: keywordPresent(term, hay),
  }));
  const matched = results.filter((r) => r.present).length;
  const total = results.length;
  const coverage = total ? Math.round((matched / total) * 100) : 0;
  return { results, matched, total, coverage };
}
