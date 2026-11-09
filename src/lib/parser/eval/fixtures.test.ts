import { writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseResumeText } from "@/lib/parser";
import { FIXTURES } from "./fixtures";
import { accuracy, scoreResume, tally, type FieldCheck } from "./score";

/**
 * Hand-built corpus of layouts the app's templates don't produce (see
 * fixtures.ts). Complements the self-labelled round-trip corpus: that one
 * proves our own exports survive; this one measures real-world variety.
 *
 * PARSER_EVAL_PRINT=1 prints the report (`npm run parser:eval`),
 * PARSER_EVAL_FIXTURES_REPORT=<file> writes it, PARSER_EVAL_VERBOSE=1 lists
 * every failed field check.
 */

const results: { id: string; checks: FieldCheck[] }[] = FIXTURES.map((f) => ({
  id: f.id,
  checks: scoreResume(f.expected, parseResumeText(f.text, f.hints).data),
}));

const all = results.flatMap((r) => r.checks);
const overall = all.length ? all.filter((c) => c.ok).length / all.length : 0;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

describe("parser accuracy on the hand-built corpus", () => {
  it("prints the accuracy report", () => {
    const fields = tally(results.map((r) => r.checks));
    const lines = [`\nParser accuracy on ${FIXTURES.length} hand-built résumés`];
    for (const [field, t] of [...fields].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`${field.padEnd(24)}${pct(accuracy(t)).padStart(7)} ${`(${t.ok}/${t.total})`.padStart(9)}`);
    }
    lines.push(`${"OVERALL".padEnd(24)}${pct(overall).padStart(7)} ${`(${all.filter((c) => c.ok).length}/${all.length})`.padStart(9)}`);
    lines.push("\nBy résumé (worst first):");
    for (const r of [...results].sort((a, b) => score(a.checks) - score(b.checks))) {
      lines.push(`  ${r.id.padEnd(20)}${pct(score(r.checks)).padStart(7)}`);
    }
    if (process.env.PARSER_EVAL_VERBOSE) {
      lines.push("\nFailed checks:");
      for (const r of results) {
        for (const c of r.checks.filter((x) => !x.ok)) {
          lines.push(`  [${r.id}] ${c.field}: expected «${c.expected}» got «${c.actual}»`);
        }
      }
    }
    const report = lines.join("\n");
    if (process.env.PARSER_EVAL_FIXTURES_REPORT) writeFileSync(process.env.PARSER_EVAL_FIXTURES_REPORT, report + "\n");
    if (process.env.PARSER_EVAL_PRINT) process.stdout.write(report + "\n");
    expect(results).toHaveLength(FIXTURES.length);
  });

  // Raise as the parser improves; never lower to make a change pass. History:
  //   2026-11-07 before step 3: 87.7% (365/416)
  //   2026-11-07 after step 3: 100.0% (416/416) — the step-3 fixes were tuned
  //   on this corpus, so it is a regression guard now, not a blind test.
  const FLOOR = 0.99;

  it(`keeps overall accuracy at or above ${(FLOOR * 100).toFixed(0)}%`, () => {
    expect(overall).toBeGreaterThanOrEqual(FLOOR);
  });
});

function score(checks: FieldCheck[]): number {
  return checks.length ? checks.filter((c) => c.ok).length / checks.length : 0;
}
