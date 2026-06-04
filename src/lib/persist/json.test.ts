import { describe, expect, it } from "vitest";

import { sectionPresence } from "@/components/pdf/templates/shared";
import { sampleResume } from "@/lib/resume/factory";
import { parseResumeJson, serializeResume } from "./json";

describe("JSON export/import round-trip", () => {
  it("strips ids on export and regenerates them on import, preserving content", () => {
    const original = sampleResume();
    const json = JSON.stringify(serializeResume(original));

    expect(json).not.toMatch(/"id"/); // internal ids stripped

    const restored = parseResumeJson(json);
    expect(restored.basics.name).toBe(original.basics.name);
    expect(restored.basics.email).toBe(original.basics.email);
    expect(restored.work.length).toBe(original.work.length);
    expect(restored.work[0].position).toBe(original.work[0].position);
    expect(restored.work[0].highlights).toEqual(original.work[0].highlights);
    expect(restored.skills.flatMap((s) => s.keywords)).toEqual(
      original.skills.flatMap((s) => s.keywords),
    );

    // ids regenerated (present but different)
    expect(restored.work[0].id).toBeTruthy();
    expect(restored.work[0].id).not.toBe(original.work[0].id);

    // template + visibility carried over
    expect(restored.meta.template).toBe(original.meta.template);
  });

  it("preserves hidden sections through a round-trip", () => {
    const original = sampleResume();
    original.meta.hiddenSections = ["projects", "certificates"];
    const restored = parseResumeJson(JSON.stringify(serializeResume(original)));
    expect(restored.meta.hiddenSections).toEqual(["projects", "certificates"]);
  });

  it("coerces a JSON Resume-style object (company / certifications / website)", () => {
    const jsonResume = {
      basics: { name: "Jo", email: "jo@x.com", website: "https://jo.dev" },
      work: [{ company: "Acme", position: "Dev", highlights: ["did x"] }],
      certifications: [{ name: "AWS", issuer: "Amazon" }],
    };
    const r = parseResumeJson(JSON.stringify(jsonResume));
    expect(r.basics.name).toBe("Jo");
    expect(r.basics.url).toBe("https://jo.dev");
    expect(r.work[0].name).toBe("Acme"); // company -> name
    expect(r.certificates[0].name).toBe("AWS"); // certifications -> certificates
  });

  it("returns a safe empty résumé for unrelated JSON, and throws on invalid JSON", () => {
    const r = parseResumeJson("{}");
    expect(r.basics.name).toBe("");
    expect(r.work).toEqual([]);
    expect(() => parseResumeJson("not json")).toThrow();
  });
});

describe("section visibility", () => {
  it("hides sections listed in meta.hiddenSections across templates", () => {
    const r = sampleResume();
    expect(sectionPresence(r).work).toBe(true);

    r.meta.hiddenSections = ["work", "skills"];
    const has = sectionPresence(r);
    expect(has.work).toBe(false);
    expect(has.skills).toBe(false);
    expect(has.education).toBe(true); // unaffected
  });
});
