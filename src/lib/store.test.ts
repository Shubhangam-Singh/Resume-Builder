import { describe, expect, it } from "vitest";

import { resolveSectionOrder } from "./resume/sections";
import { useResumeStore } from "./store";

describe("moveSection keeps the section order well-formed", () => {
  it("never duplicates or drops sections across many moves", () => {
    useResumeStore.getState().loadSample();

    for (let n = 0; n < 25; n++) {
      useResumeStore.getState().moveSection("skills", 1);
      useResumeStore.getState().moveSection("summary", -1);
      useResumeStore.getState().moveSection("projects", -1);

      const meta = useResumeStore.getState().resume.meta;
      const order = resolveSectionOrder(meta);
      expect(order).toHaveLength(6);
      expect(new Set(order).size).toBe(6); // all unique

      const saved = meta.sectionOrder ?? [];
      expect(new Set(saved).size).toBe(saved.length); // no dupes persisted
    }
  });
});
