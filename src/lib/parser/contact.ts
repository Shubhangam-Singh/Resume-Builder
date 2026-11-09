/**
 * Email & phone extraction — ported from the reference C#. Multi-strategy with
 * fallbacks. India formats are supported as ONE of several first-class formats
 * (US grouping and generic international are also handled) since this is global.
 */

const PERSONAL_MAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "outlook.com",
  "hotmail.com", "live.com", "icloud.com", "protonmail.com", "proton.me",
  "rediffmail.com", "ymail.com",
];

export function extractEmail(text: string): string {
  const re = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  const matches = text.match(re) || [];

  if (matches.length === 0) {
    // Last resort: an email split across lines in a multi-column extract.
    const joined = text.replace(/\s*\n\s*/g, "");
    const m2 = joined.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
    return m2 ? m2[0].toLowerCase() : "";
  }

  const emails = [
    ...new Set(matches.map((e) => e.trim().replace(/\.$/, "").toLowerCase())),
  ];

  // Prefer a personal mailbox when both personal and corporate exist.
  const preferred = emails.find((e) =>
    PERSONAL_MAIL_DOMAINS.some((d) => e.endsWith("@" + d)),
  );
  return preferred ?? emails[0];
}

const PHONE_KEYWORD = /(phone|mobile|cell|contact|tel|mob|ph)\W{0,3}$/i;

const PHONE_PATTERNS = [
  /\+?91[\s\-]?[6-9]\d{4}[\s\-]?\d{5}/g, // +91 82993 63396
  /\+?91[\s\-]?[6-9]\d{9}/g, // +919876543210
  /\+?91\s*\(\d{4,5}\)[\s\-]?\d{3,5}[\s\-]?\d{0,5}/g, // +91(9876)543-210
  /(?<!\d)[6-9]\d{4}[\s\-]\d{5}(?!\d)/g, // 82993 63396
  /(?<!\d)0?[6-9]\d{9}(?!\d)/g, // 9876543210
  /\+\d{1,3}[\s\-]?\(\d{2,6}\)[\s\-]?\d{3,5}(?:[\s\-]?\d{0,5})/g, // +CC (XXXX)
  /\+\d{1,3}[\s\-]?\d{2,5}[\s\-]?\d{3,5}(?:[\s\-]?\d{0,5})/g, // +CC plain
  /(?<!\d)\(?\d{3}\)?[\s\-.]\d{3}[\s\-.]\d{4}(?!\d)/g, // US (415) 555-2671
];

function stripPhoneExtension(phone: string): string {
  if (!phone) return phone;
  return phone
    .replace(/\s*(?:ext\.?\s*\d{1,6}|(?<=\D)x\s*\d{1,6}|#\s*\d{1,6})\s*$/i, "")
    .trim();
}

function normalizeCore(digits: string): string {
  let core = digits;
  if (core.length === 12 && core.startsWith("91")) core = core.slice(2);
  else if (core.length === 11 && core.startsWith("1")) core = core.slice(1);
  else if (core.length === 11 && core.startsWith("0")) core = core.slice(1);
  return core;
}

export function extractPhone(text: string): string {
  for (const pat of PHONE_PATTERNS) {
    pat.lastIndex = 0;
    let bestRaw: string | null = null;
    let bestScore = -Infinity;

    let m;
    while ((m = pat.exec(text)) !== null) {
      const raw = m[0].trim();
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) continue;

      const core = normalizeCore(digits);
      const indianValid = /^[6-9]\d{9}$/.test(core);
      const tenDigit = core.length === 10;
      const intlValid =
        raw.startsWith("+") && digits.length >= 10 && digits.length <= 13;
      if (!indianValid && !tenDigit && !intlValid) continue;

      let score = indianValid ? 5 : 0;
      const idx = m.index ?? 0;
      const prefix = text.slice(Math.max(0, idx - 12), idx);
      if (PHONE_KEYWORD.test(prefix)) score += 10;

      if (score > bestScore) {
        bestScore = score;
        bestRaw = raw;
      }
    }

    if (bestRaw != null) return stripPhoneExtension(bestRaw);
  }

  const collapsed = extractPhoneFromCollapsed(text);
  if (collapsed) return stripPhoneExtension(collapsed);

  const split = extractPhoneSplitHalf(text);
  if (split) return stripPhoneExtension(split);

  return extractPhoneInternational(text);
}

// Digits grouped by single spaces/dots/hyphens, optionally with "+CC" or a
// bracketed area code: "07911 123456", "06 12 34 56 78", "+33 6 12 34 56 78".
const GENERIC_PHONE =
  /(?<![\w+/.-])(?:\+\d{1,3}[ .-]?)?(?:\(\d{1,5}\)[ .-]?)?\d(?:[ .-]?\d){7,14}(?![\w/-])/g;
// Numbers that are identifiers, not phones.
const ID_KEYWORD = /(?:roll|reg(?:istration)?|enrol(?:l)?ment|aadhaar|aadhar|pan|passport|account|a\/c|isbn|id)\W{0,4}$/i;

/**
 * Last resort for formats the patterns above don't know (UK, France, Germany,
 * Australia…): a national number with its trunk "0" or an international one
 * with "+", 9–15 digits (E.164), preferring one next to a phone label.
 */
function extractPhoneInternational(text: string): string {
  GENERIC_PHONE.lastIndex = 0;
  let best: { raw: string; score: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = GENERIC_PHONE.exec(text)) !== null) {
    const raw = m[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) continue;
    if (!raw.startsWith("+") && !digits.startsWith("0")) continue;
    // "2019 2021 2023" — a run of years, not a number.
    if (/^(?:(?:19|20)\d{2}[ .-]?)+$/.test(raw)) continue;
    const prefix = text.slice(Math.max(0, m.index - 16), m.index);
    if (ID_KEYWORD.test(prefix)) continue;
    const score = PHONE_KEYWORD.test(prefix.slice(-12)) ? 10 : 0;
    if (!best || score > best.score) best = { raw, score };
  }
  return best ? stripPhoneExtension(best.raw) : "";
}

function extractPhoneFromCollapsed(text: string): string {
  const collapsed = text.replace(/\s*\n\s*/g, "");
  for (const pat of PHONE_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(collapsed)) !== null) {
      const raw = m[0].trim();
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) continue;
      const core = normalizeCore(digits);
      const indianValid = /^[6-9]\d{9}$/.test(core);
      const tenDigit = core.length === 10;
      const intlValid =
        raw.startsWith("+") && digits.length >= 10 && digits.length <= 13;
      if (indianValid || tenDigit || intlValid) return raw;
    }
  }
  return "";
}

// "split-half" forward scan for columnar extracts where a 5+5 Indian number is
// broken across other column content.
function extractPhoneSplitHalf(text: string): string {
  const firstHalf = text.match(/(?<prefix>\+?91[\s\-]?)(?<part>[6-9]\d{4})(?!\d)/);
  if (!firstHalf || firstHalf.index === undefined || !firstHalf.groups) return "";

  const part1 = firstHalf.groups.part;
  const afterFirst = firstHalf.index + firstHalf[0].length;
  const window = text.slice(afterFirst, afterFirst + 300);
  const secondHalf = window.match(/(?<!\d)(\d{5})(?!\d)/);
  if (!secondHalf) return "";

  const part2 = secondHalf[1];
  const combined = part1 + part2;
  if (!/^[6-9]\d{9}$/.test(combined)) return "";

  return `+91-${part1} ${part2}`;
}
