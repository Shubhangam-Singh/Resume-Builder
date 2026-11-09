"use client";

import { useEffect } from "react";

import { CYCLE_MS, KEY_MOMENTS, drawScene, sceneAt } from "@/lib/favicon/forge-animation";

/** Canvas size: crisp at the 16–32 px a tab shows, on high-DPI screens too. */
const SIZE = 64;
const FRAME_MS = 1000 / 15;
/** A background tab updates its icon about once a second at most. */
const BACKGROUND_BEAT_MS = 1000;
/** Reduced motion: a calm pace for the still key moments. */
const REDUCED_BEAT_MS = 1200;

/**
 * Animates the tab icon ("Strike & Temper", see lib/favicon). Takes over the
 * page's own icon links while running and puts them back when it stops.
 *
 * - Visible tab: the full animation, drawn at ~15 fps.
 * - Background tab: the story's key moments as a once-a-second slideshow,
 *   since browsers throttle background timers and skip animation frames.
 * - Reduced motion (e.g. Windows "Animation effects" off): no movement — the
 *   key moments swap in place at a slow pace, like still frames.
 */
export function AnimatedFavicon() {
  useEffect(() => {
    if (typeof Path2D === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(SIZE / 32, SIZE / 32);

    // The icon links the page renders (Next's /icon.png); one is created if
    // there are none. Their original targets come back on stop.
    let links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    let created: HTMLLinkElement | null = null;
    if (links.length === 0) {
      created = document.createElement("link");
      created.rel = "icon";
      document.head.appendChild(created);
      links = [created];
    }
    const originals = links.map((l) => ({ href: l.getAttribute("href"), type: l.getAttribute("type") }));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let timer = 0;
    let last = 0;
    let beat = 0;
    const start = performance.now();

    const show = (t: number) => {
      drawScene(ctx, sceneAt(t));
      const url = canvas.toDataURL("image/png");
      for (const l of links) {
        l.type = "image/png";
        l.href = url;
      }
    };
    const restore = () => {
      links.forEach((l, i) => {
        const { href, type } = originals[i];
        if (href === null) l.removeAttribute("href");
        else l.setAttribute("href", href);
        if (type === null) l.removeAttribute("type");
        else l.setAttribute("type", type);
      });
    };
    const halt = () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      raf = 0;
      timer = 0;
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      show(((now - start) % CYCLE_MS) / CYCLE_MS);
    };
    const run = () => {
      halt();
      if (document.hidden || reduceMotion.matches) {
        const next = () => show(KEY_MOMENTS[beat++ % KEY_MOMENTS.length]);
        next();
        timer = window.setInterval(next, document.hidden ? BACKGROUND_BEAT_MS : REDUCED_BEAT_MS);
      } else {
        raf = requestAnimationFrame(frame);
      }
    };

    run();
    document.addEventListener("visibilitychange", run);
    reduceMotion.addEventListener("change", run);
    return () => {
      halt();
      document.removeEventListener("visibilitychange", run);
      reduceMotion.removeEventListener("change", run);
      restore();
      created?.remove();
    };
  }, []);

  return null;
}
