import type { ResumeData } from "@/lib/resume/types";

/**
 * Single entry point for turning ResumeData into a PDF blob. Prefers a Web
 * Worker so @react-pdf's CPU-heavy layout never blocks the main thread (the
 * cause of preview jitter while typing); falls back to rendering on the main
 * thread if the worker can't start or crashes.
 */

interface Pending {
  resolve: (blob: Blob) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, Pending>();

function failAllPending(reason: string): void {
  for (const p of pending.values()) p.reject(new Error(reason));
  pending.clear();
}

function getWorker(): Worker | null {
  if (workerBroken || typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../../workers/resume-pdf.worker.ts", import.meta.url));
  } catch {
    workerBroken = true;
    return null;
  }
  worker.onmessage = (
    event: MessageEvent<
      { id: number; ok: true; buf: ArrayBuffer } | { id: number; ok: false; error: string }
    >,
  ) => {
    const msg = event.data;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(new Blob([msg.buf], { type: "application/pdf" }));
    else p.reject(new Error(msg.error));
  };
  // A worker-level error means the script itself failed (e.g. failed to load).
  // Mark it broken so every future render uses the main-thread fallback.
  worker.onerror = () => {
    workerBroken = true;
    worker?.terminate();
    worker = null;
    failAllPending("PDF worker crashed");
  };
  return worker;
}

async function renderOnMainThread(data: ResumeData): Promise<Blob> {
  const [{ pdf }, { buildResumeDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/ResumeDocument"),
  ]);
  return pdf(buildResumeDocument(data)).toBlob();
}

async function renderNow(data: ResumeData): Promise<Blob> {
  const w = getWorker();
  if (w) {
    try {
      return await new Promise<Blob>((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        w.postMessage({ id, data });
      });
    } catch (err) {
      // Individual render errors (bad font, template bug) would also fail on
      // the main thread, but a broken worker shouldn't take the app down —
      // retry once outside it.
      console.warn("PDF worker render failed, falling back to main thread", err);
    }
  }
  return renderOnMainThread(data);
}

/** Rejection used when a queued render is displaced by a newer one. */
export class RenderSuperseded extends Error {
  constructor() {
    super("Render superseded by a newer request");
    this.name = "RenderSuperseded";
  }
}

interface Lane {
  inFlight: boolean;
  next: { data: ResumeData; resolve: (b: Blob) => void; reject: (e: Error) => void } | null;
}

const lanes = new Map<string, Lane>();

/**
 * Turn ResumeData into a PDF blob.
 *
 * Pass a `lane` for continuous consumers (the live preview): within a lane at
 * most one render runs and at most one waits — a burst of edits renders only
 * the newest state instead of every intermediate keystroke, and each displaced
 * request rejects with RenderSuperseded. One-shot consumers (download, print,
 * ATS check) omit the lane and always render exactly what they asked for.
 */
export function renderResumePdf(
  data: ResumeData,
  opts?: { lane?: string },
): Promise<Blob> {
  const laneId = opts?.lane;
  if (!laneId) return renderNow(data);

  let lane = lanes.get(laneId);
  if (!lane) {
    lane = { inFlight: false, next: null };
    lanes.set(laneId, lane);
  }
  const l = lane;

  return new Promise<Blob>((resolve, reject) => {
    if (l.inFlight) {
      l.next?.reject(new RenderSuperseded());
      l.next = { data, resolve, reject };
      return;
    }
    l.inFlight = true;
    const run = (
      d: ResumeData,
      res: (b: Blob) => void,
      rej: (e: Error) => void,
    ): void => {
      renderNow(d)
        .then(res, rej)
        .finally(() => {
          const queued = l.next;
          l.next = null;
          if (queued) run(queued.data, queued.resolve, queued.reject);
          else l.inFlight = false;
        });
    };
    run(data, resolve, reject);
  });
}

/**
 * Start the render worker during idle time so the first real preview doesn't
 * pay the worker-boot + react-pdf-import cost. Safe to call multiple times.
 */
export function prewarmPdfRenderer(): void {
  if (typeof window === "undefined") return;
  const idle =
    "requestIdleCallback" in window
      ? window.requestIdleCallback.bind(window)
      : (cb: () => void) => window.setTimeout(cb, 200);
  idle(() => {
    getWorker();
  });
}
