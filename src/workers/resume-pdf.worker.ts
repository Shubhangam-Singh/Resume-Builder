import { pdf } from "@react-pdf/renderer";

import { buildResumeDocument } from "@/components/pdf/ResumeDocument";
import type { ResumeData } from "@/lib/resume/types";

/**
 * Renders the resume PDF off the main thread. Each request builds a fresh
 * document tree and pdf() instance, so there's no reconciler state carried
 * between renders (which is what caused duplicated sections when react-pdf
 * reconciled reordered siblings on the main thread).
 *
 * Renders are chained sequentially: a worker is single-threaded anyway, and
 * interleaving two layout passes at await points just doubles peak memory.
 */

interface RenderRequest {
  id: number;
  data: ResumeData;
}

type RenderResponse =
  | { id: number; ok: true; buf: ArrayBuffer }
  | { id: number; ok: false; error: string };

let chain: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<RenderRequest>) => {
  const { id, data } = event.data;
  chain = chain.then(async () => {
    try {
      const blob = await pdf(buildResumeDocument(data)).toBlob();
      const buf = await blob.arrayBuffer();
      const msg: RenderResponse = { id, ok: true, buf };
      self.postMessage(msg, { transfer: [buf] });
    } catch (err) {
      const msg: RenderResponse = { id, ok: false, error: String(err) };
      self.postMessage(msg);
    }
  });
};
