import { describe, expect, it } from "vitest";

import { normalizeText, normalizeTextDetailed } from "@/lib/parser/normalize";
import { pdfExtract, SAMPLES } from "@/lib/parser/eval/roundtrip";
import { TEMPLATES } from "./meta";

/**
 * A custom section's heading must be set exactly like the template's own
 * headings — same size, weight and letter-spacing — in every template. It
 * used to be drawn in one shared style, so Banner's custom headings had no
 * chip, Zenith's sat full-width instead of in the margin, and Sidebar's were
 * a size smaller. Checked on the PDF the template actually renders.
 */

const sample = SAMPLES.find((s) => s.id === "unknown-sections")!;
const squash = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

describe("custom section headings follow each template's heading style", () => {
  it.each(TEMPLATES.map((t) => t.id))("%s", async (id) => {
    const data = sample.data();
    data.meta.template = id;
    const { text, lineStyles } = await pdfExtract(data);

    const styleOf = (heading: string) => {
      const s = lineStyles.find((l) => squash(normalizeText(l.text)) === squash(heading));
      return s ? { size: s.size, bold: s.bold } : null;
    };
    const known = styleOf("Experience");
    const custom = styleOf("Open Source");

    if (known || custom) {
      expect(custom).toEqual(known);
    } else {
      // Headings set in a margin beside their content (Zenith) share a line
      // with it; there the shared style is the letter-spacing.
      const spaced = normalizeTextDetailed(text).spacedHeadings.map(squash);
      expect(spaced).toContain("EXPERIENCE");
      expect(spaced).toContain("OPENSOURCE");
    }
  }, 30_000);
});
