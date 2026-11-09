import { describe, expect, it } from "vitest";

import { KEY_MOMENTS, sceneAt } from "./forge-animation";

const rgb = (c: string) => c.match(/\d+/g)!.map(Number);

describe("Strike & Temper tab icon", () => {
  it("lands the hammer on the anvil at each of the three blows", () => {
    for (const t of [0.18, 0.36, 0.54]) expect(sceneAt(t).hammerAngle).toBeCloseTo(-25, 5);
    expect(sceneAt(0.1).hammerAngle).toBeGreaterThan(30); // wound up before the first
  });

  it("throws sparks just after each blow, and only then", () => {
    for (const t of [0.185, 0.365, 0.545]) expect(sceneAt(t).sparkOpacity).toBeGreaterThan(0.9);
    for (const t of [0.05, 0.3, 0.8]) expect(sceneAt(t).sparkOpacity).toBe(0);
    expect(sceneAt(0.6).sparkScale).toBeGreaterThan(sceneAt(0.22).sparkScale); // the last is the biggest
  });

  it("cools the page from red-hot to forest green", () => {
    expect(rgb(sceneAt(0.05).docColor)).toEqual([255, 77, 31]);
    const amber = rgb(sceneAt(0.45).docColor);
    expect(amber[1]).toBeGreaterThan(140); // more yellow than the red start
    expect(rgb(sceneAt(0.8).docColor)).toEqual([47, 191, 113]);
    expect(sceneAt(0.05).glowOpacity).toBeGreaterThan(sceneAt(0.45).glowOpacity);
    expect(sceneAt(0.8).glowOpacity).toBe(0);
  });

  it("writes the page's content in only once it has cooled", () => {
    expect(sceneAt(0.3).lines).toEqual([0, 0, 0]);
    expect(sceneAt(0.3).avatarScale).toBe(0);
    expect(sceneAt(0.85).lines).toEqual([1, 1, 1]);
    expect(sceneAt(0.85).avatarScale).toBe(1);
  });

  it("squashes the page on impact", () => {
    expect(sceneAt(0.545).squashY).toBeLessThan(0.9);
    expect(sceneAt(0.8).squashY).toBe(1);
  });

  it("loops seamlessly and wraps any time into the loop", () => {
    const start = sceneAt(0);
    const end = sceneAt(0.99999);
    expect(end.docColor).toBe(start.docColor);
    expect(end.lines).toEqual(start.lines);
    for (const key of ["hammerAngle", "sparkOpacity", "sparkScale", "glowOpacity", "squashX", "squashY", "avatarScale"] as const) {
      expect(end[key]).toBeCloseTo(start[key], 5);
    }
    expect(sceneAt(1.25)).toEqual(sceneAt(0.25));
    expect(sceneAt(-0.75)).toEqual(sceneAt(0.25));
  });

  it("tells the story in its background-tab key moments", () => {
    const [hot, strike, sparks, quenched, written] = KEY_MOMENTS.map(sceneAt);
    expect(rgb(hot.docColor)[0]).toBe(255);
    expect(strike.hammerAngle).toBeLessThan(-20);
    expect(sparks.sparkOpacity).toBeGreaterThan(0.5);
    expect(rgb(quenched.docColor)).toEqual([47, 191, 113]);
    expect(written.lines).toEqual([1, 1, 1]);
  });
});
