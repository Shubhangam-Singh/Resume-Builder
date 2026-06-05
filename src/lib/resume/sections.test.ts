import { describe, expect, it } from "vitest";

import { emptyResume } from "./factory";
import { DEFAULT_SECTION_ORDER, resolveSectionOrder } from "./sections";
import type { HideableSection } from "./types";

describe("resolveSectionOrder", () => {
  it("returns the default order when none is saved", () => {
    const r = emptyResume();
    expect(resolveSectionOrder(r.meta)).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("honors a saved order and appends any omitted sections", () => {
    const r = emptyResume();
    r.meta.sectionOrder = ["skills", "work"];
    const result = resolveSectionOrder(r.meta);
    expect(result.slice(0, 2)).toEqual(["skills", "work"]);
    // every section appears exactly once
    expect([...result].sort()).toEqual([...DEFAULT_SECTION_ORDER].sort());
    expect(result).toHaveLength(DEFAULT_SECTION_ORDER.length);
  });

  it("drops duplicates and unknown keys", () => {
    const r = emptyResume();
    r.meta.sectionOrder = [
      "work",
      "work",
      "bogus",
      "skills",
    ] as HideableSection[];
    const result = resolveSectionOrder(r.meta);
    expect(result.filter((k) => k === "work")).toHaveLength(1);
    expect(result).not.toContain("bogus" as HideableSection);
    expect(result).toHaveLength(DEFAULT_SECTION_ORDER.length);
  });
});
