// Copies the pdf.js worker into public/ so it is served locally (never from a
// CDN — the privacy promise requires everything to stay in the user's browser).
// Runs automatically via the predev/prebuild npm lifecycle hooks, so the worker
// version always matches the installed pdfjs-dist.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const src = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const dest = resolve(process.cwd(), "public", "pdf.worker.min.mjs");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] ${src} -> ${dest}`);
