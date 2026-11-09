import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { TEMPLATES } from "@/components/pdf/templates/meta";
import { accuracy, scoreResume, tally, type FieldCheck } from "./score";
import { docxRoundTrip, pdfRoundTrip, SAMPLES, txtRoundTrip } from "./roundtrip";

/**
 * Self-labelled round-trip corpus: 6 sample resumes × (12 PDF templates + Word
 * + plain text) = 84 documents. Prints a per-field accuracy report and fails
 * if any group drops below its floor, so parser changes can't silently regress.
 *
 * PARSER_EVAL_REPORT=<file> writes the report there (`npm run parser:eval`
 * prints it); PARSER_EVAL_VERBOSE=1 adds every failed field check;
 * PARSER_EVAL_DUMP=<dir> saves each document's extracted text for debugging.
 */

type Group = "pdf-ats" | "pdf-multicol" | "docx" | "txt";

interface DocResult {
  group: Group;
  source: string; // e.g. "modern/ux-designer"
  checks: FieldCheck[];
}

const results: DocResult[] = [];

const dumpDir = process.env.PARSER_EVAL_DUMP;
if (dumpDir) mkdirSync(dumpDir, { recursive: true });
function dump(source: string, text: string): void {
  if (dumpDir) writeFileSync(join(dumpDir, `${source.replace("/", "__")}.txt`), text);
}

beforeAll(async () => {
  for (const sample of SAMPLES) {
    for (const t of TEMPLATES) {
      const data = sample.data();
      data.meta.template = t.id;
      const source = `${t.id}/${sample.id}`;
      const { text, parsed } = await pdfRoundTrip(data);
      dump(source, text);
      results.push({
        group: t.atsSafe ? "pdf-ats" : "pdf-multicol",
        source,
        checks: scoreResume(data, parsed.data),
      });
    }
    const data = sample.data();
    const docx = await docxRoundTrip(data);
    dump(`docx/${sample.id}`, docx.text);
    results.push({ group: "docx", source: `docx/${sample.id}`, checks: scoreResume(data, docx.parsed.data) });
    const txt = txtRoundTrip(data);
    dump(`txt/${sample.id}`, txt.text);
    results.push({ group: "txt", source: `txt/${sample.id}`, checks: scoreResume(data, txt.parsed.data) });
  }
}, 240_000);

const GROUPS: Group[] = ["pdf-ats", "pdf-multicol", "docx", "txt"];
const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(5);

function overall(group: Group): number {
  const docs = results.filter((r) => r.group === group).map((r) => r.checks);
  const all = docs.flat();
  return all.length ? all.filter((c) => c.ok).length / all.length : 0;
}

describe("parser round-trip accuracy", () => {
  it("prints the accuracy report", () => {
    const byGroup = new Map(
      GROUPS.map((g) => [g, tally(results.filter((r) => r.group === g).map((r) => r.checks))]),
    );
    const fields = [...new Set(results.flatMap((r) => r.checks.map((c) => c.field)))].sort();

    const lines: string[] = [];
    lines.push(`\nParser round-trip accuracy (${results.length} documents)`);
    lines.push(`${"field".padEnd(24)}${GROUPS.map((g) => g.padStart(14)).join("")}`);
    for (const f of fields) {
      lines.push(
        `${f.padEnd(24)}${GROUPS.map((g) => {
          const t = byGroup.get(g)?.get(f);
          return (t ? `${pct(accuracy(t))} ${`(${t.ok}/${t.total})`.padStart(8)}` : "-").padStart(14);
        }).join("")}`,
      );
    }
    lines.push(
      `${"OVERALL".padEnd(24)}${GROUPS.map((g) => `${(overall(g) * 100).toFixed(1)}%`.padStart(14)).join("")}`,
    );

    // Per-template overall, worst first — shows which layouts need work.
    const perSource = new Map<string, { ok: number; total: number }>();
    for (const r of results) {
      const key = r.source.split("/")[0];
      const cur = perSource.get(key) ?? { ok: 0, total: 0 };
      cur.ok += r.checks.filter((c) => c.ok).length;
      cur.total += r.checks.length;
      perSource.set(key, cur);
    }
    lines.push("\nBy source (worst first):");
    for (const [k, v] of [...perSource].sort((a, b) => a[1].ok / a[1].total - b[1].ok / b[1].total)) {
      lines.push(`  ${k.padEnd(14)}${pct(v.ok / v.total)}`);
    }

    if (process.env.PARSER_EVAL_VERBOSE) {
      lines.push("\nFailed checks:");
      for (const r of results) {
        for (const c of r.checks.filter((x) => !x.ok)) {
          lines.push(`  [${r.source}] ${c.field}: expected «${c.expected}» got «${c.actual}»`);
        }
      }
    }
    const report = lines.join("\n");
    if (process.env.PARSER_EVAL_REPORT) writeFileSync(process.env.PARSER_EVAL_REPORT, report + "\n");
    // Straight to stdout: Vitest only relays console output from failing tests.
    if (process.env.PARSER_EVAL_PRINT) process.stdout.write(report + "\n");
    expect(results.length).toBe(SAMPLES.length * (TEMPLATES.length + 2));
  });

  // Floors: raise these as the parser improves; never lower them to make a
  // change pass. Each is the measured accuracy rounded down. History:
  //   2026-11-06 before fixes: 60.0 / 38.0 / 77.0 / 82.0 (%)
  //   2026-11-06 after fixes:  99.1 / 98.9 / 100.0 / 100.0 (%)
  //   2026-11-07 step 3:      100.0 / 100.0 / 100.0 / 100.0 (%)
  //   2026-11-07 step 4 adds the "unknown-sections" sample (headings no
  //   vocabulary knows). Without heading-style learning: 98.8 / 98.9 / 98.7 /
  //   98.7; with it: 100.0 / 99.2 / 100.0 / 100.0. The multicol misses are
  //   Sidebar, Banner and Zenith, whose custom-section titles are drawn in a
  //   different style from the template's own headings, so style can't
  //   identify them (see CustomSection.tsx).
  const FLOORS: Record<Group, number> = {
    "pdf-ats": 0.995,
    "pdf-multicol": 0.99,
    docx: 0.995,
    txt: 0.995,
  };

  for (const g of GROUPS) {
    it(`keeps ${g} accuracy at or above ${(FLOORS[g] * 100).toFixed(1)}%`, () => {
      expect(overall(g)).toBeGreaterThanOrEqual(FLOORS[g]);
    });
  }
});
