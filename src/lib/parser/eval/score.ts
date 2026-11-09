/**
 * Field-level scoring for the parser: compares what the parser recovered from a
 * document against the ResumeData that document was generated from. Pure, so
 * the round-trip harness and ad-hoc fixtures can share it.
 *
 * Comparisons are deliberately forgiving about presentation (case, spacing,
 * dash style, URL protocol) and strict about content.
 */
import { normalizeSkillToken } from "@/lib/parser/skills";
import type { ResumeData } from "@/lib/resume/types";

export interface FieldCheck {
  /** Stable field id, e.g. "work.position" — used to aggregate across documents. */
  field: string;
  ok: boolean;
  expected: string;
  actual: string;
}

const norm = (s: string | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/[^\S\n]+/g, " ")
    .trim();

const digits = (s: string) => s.replace(/\D/g, "");

const normUrl = (s: string) =>
  norm(s)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

function check(
  out: FieldCheck[],
  field: string,
  expected: string,
  actual: string,
  ok: boolean,
): void {
  out.push({ field, ok, expected, actual });
}

/** Exact match after normalization; skipped when nothing was expected. */
function textField(out: FieldCheck[], field: string, expected: string, actual: string) {
  if (!expected.trim()) return;
  check(out, field, expected, actual, norm(expected) === norm(actual));
}

/** Token overlap, for long prose where a stray separator shouldn't fail it. */
function proseField(out: FieldCheck[], field: string, expected: string, actual: string) {
  if (!expected.trim()) return;
  const tok = (s: string) => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const exp = tok(expected);
  const act = new Set(tok(actual));
  const hit = exp.filter((t) => act.has(t)).length;
  const extra = tok(actual).length - exp.length;
  // ≥95% of the expected words present, and not padded with another section.
  const ok = exp.length > 0 && hit / exp.length >= 0.95 && extra <= exp.length * 0.25;
  check(out, field, expected, actual, ok);
}

function listField(out: FieldCheck[], field: string, expected: string[], actual: string[]) {
  if (expected.length === 0) return;
  const a = actual.map(norm);
  const ok = expected.length === actual.length && expected.every((e, i) => norm(e) === a[i]);
  check(out, field, expected.join(" ¦ "), actual.join(" ¦ "), ok);
}

/** Pair expected entries with parsed ones by best key overlap (not index). */
function align<T>(expected: T[], actual: T[], key: (x: T) => string): (T | undefined)[] {
  const used = new Set<number>();
  const words = (s: string) => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1));
  return expected.map((e) => {
    const ew = words(key(e));
    let best = -1;
    let bestScore = 0;
    actual.forEach((a, i) => {
      if (used.has(i)) return;
      const aw = words(key(a));
      let score = 0;
      for (const w of ew) if (aw.has(w)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best < 0) return undefined;
    used.add(best);
    return actual[best];
  });
}

export function scoreResume(expected: ResumeData, actual: ResumeData): FieldCheck[] {
  const out: FieldCheck[] = [];
  const eb = expected.basics;
  const ab = actual.basics;

  textField(out, "basics.name", eb.name, ab.name);
  textField(out, "basics.label", eb.label, ab.label);
  textField(out, "basics.email", eb.email, ab.email);
  if (eb.phone) {
    const ed = digits(eb.phone);
    check(out, "basics.phone", eb.phone, ab.phone, ed.length > 0 && digits(ab.phone).endsWith(ed.slice(-10)));
  }
  if (eb.url) check(out, "basics.url", eb.url, ab.url, normUrl(eb.url) === normUrl(ab.url));
  textField(out, "basics.city", eb.location.city, ab.location.city);
  textField(out, "basics.region", eb.location.region, ab.location.region);
  proseField(out, "basics.summary", eb.summary, ab.summary);
  for (const p of eb.profiles) {
    const found = ab.profiles.find(
      (q) => norm(q.network) === norm(p.network) && norm(q.username) === norm(p.username),
    );
    check(out, "basics.profiles", `${p.network}:${p.username}`, ab.profiles.map((q) => `${q.network}:${q.username}`).join(", "), !!found);
  }

  // ---- work
  if (expected.work.length) {
    check(out, "work.count", String(expected.work.length), String(actual.work.length), expected.work.length === actual.work.length);
  }
  const workPairs = align(expected.work, actual.work, (w) => `${w.position} ${w.name}`);
  expected.work.forEach((e, i) => {
    const a = workPairs[i];
    textField(out, "work.position", e.position, a?.position ?? "");
    textField(out, "work.company", e.name, a?.name ?? "");
    if (e.startDate) check(out, "work.startDate", e.startDate, a?.startDate ?? "", e.startDate === a?.startDate);
    check(out, "work.endDate", e.endDate || "(present)", a ? a.endDate || "(present)" : "", !!a && e.endDate === a.endDate);
    textField(out, "work.location", e.location, a?.location ?? "");
    listField(out, "work.highlights", e.highlights, a?.highlights ?? []);
  });

  // ---- education
  if (expected.education.length) {
    check(out, "education.count", String(expected.education.length), String(actual.education.length), expected.education.length === actual.education.length);
  }
  const eduPairs = align(expected.education, actual.education, (e) => `${e.institution} ${e.studyType} ${e.area}`);
  expected.education.forEach((e, i) => {
    const a = eduPairs[i];
    textField(out, "education.institution", e.institution, a?.institution ?? "");
    textField(out, "education.studyType", e.studyType, a?.studyType ?? "");
    textField(out, "education.area", e.area, a?.area ?? "");
    if (e.startDate) check(out, "education.startDate", e.startDate, a?.startDate ?? "", e.startDate === a?.startDate);
    if (e.endDate) check(out, "education.endDate", e.endDate, a?.endDate ?? "", e.endDate === a?.endDate);
    textField(out, "education.score", e.score, a?.score ?? "");
    listField(out, "education.courses", e.courses, a?.courses ?? []);
  });

  // ---- projects
  if (expected.projects.length) {
    check(out, "projects.count", String(expected.projects.length), String(actual.projects.length), expected.projects.length === actual.projects.length);
  }
  const projPairs = align(expected.projects, actual.projects, (p) => p.name);
  expected.projects.forEach((e, i) => {
    const a = projPairs[i];
    textField(out, "projects.name", e.name, a?.name ?? "");
    proseField(out, "projects.description", e.description, a?.description ?? "");
    listField(out, "projects.highlights", e.highlights, a?.highlights ?? []);
  });

  // ---- skills: every keyword the user wrote must survive (category-agnostic).
  // Judged the way the importer treats skills: aliases count as their
  // canonical name ("Apache Spark" → "Spark") and "Agile / Scrum" counts when
  // both parts survive, since " / " separates items.
  const skillKey = (k: string) => norm(normalizeSkillToken(k));
  const actualKeywords = new Set(actual.skills.flatMap((s) => s.keywords).map(skillKey));
  for (const s of expected.skills) {
    for (const k of s.keywords) {
      const ok = k.split(/\s\/\s/).every((part) => actualKeywords.has(skillKey(part)));
      check(out, "skills.keyword", k, ok ? k : "(missing)", ok);
    }
  }

  // ---- certificates
  if (expected.certificates.length) {
    check(out, "certificates.count", String(expected.certificates.length), String(actual.certificates.length), expected.certificates.length === actual.certificates.length);
  }
  const certPairs = align(expected.certificates, actual.certificates, (c) => c.name);
  expected.certificates.forEach((e, i) => {
    const a = certPairs[i];
    textField(out, "certificates.name", e.name, a?.name ?? "");
    textField(out, "certificates.issuer", e.issuer, a?.issuer ?? "");
    if (e.date) check(out, "certificates.date", e.date, a?.date ?? "", e.date === a?.date);
  });

  // ---- custom sections: kept under their own heading, every item intact
  for (const e of expected.customSections ?? []) {
    const a = (actual.customSections ?? []).find((s) => norm(s.title) === norm(e.title));
    check(out, "custom.title", e.title, a?.title ?? "(missing)", !!a);
    check(out, "custom.items", String(e.items.length), String(a?.items.length ?? 0), a?.items.length === e.items.length);
  }

  // ---- precision of the "never lose content" net: on a document whose every
  // line belongs to a field, nothing should be left over.
  const expectsLeftovers = (expected.customSections ?? []).some((s) => norm(s.title) === "additional information");
  if (!expectsLeftovers) {
    const leftovers = (actual.customSections ?? []).find((s) => norm(s.title) === "additional information");
    check(out, "unplaced.lines", "(none)", leftovers ? leftovers.items.map((i) => i.name).join(" ¦ ") : "(none)", !leftovers);
  }

  return out;
}

export interface FieldTally {
  ok: number;
  total: number;
}

/** Sum per-field results across many documents. */
export function tally(results: FieldCheck[][]): Map<string, FieldTally> {
  const t = new Map<string, FieldTally>();
  for (const doc of results) {
    for (const r of doc) {
      const cur = t.get(r.field) ?? { ok: 0, total: 0 };
      cur.total++;
      if (r.ok) cur.ok++;
      t.set(r.field, cur);
    }
  }
  return t;
}

export function accuracy(t: FieldTally | undefined): number {
  return t && t.total ? t.ok / t.total : 0;
}
