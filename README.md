# ResumeForge

**A free, open, privacy-first, ATS-friendly resume builder that runs entirely in your browser.**

No signup. No paywall. No server. Your resume data never leaves your device.

> Same ethos as tools like _ilovepdf_ — genuinely free for everyone, with the
> core flow (build → preview → export) requiring no account.

---

## Why this exists

Most resume builders lock exports behind a subscription, harvest your data, or
quietly produce PDFs that applicant tracking systems (ATS) can't read.
ResumeForge does the opposite:

- **100% client-side.** Parsing, rendering, and PDF generation all happen in
  your browser. There is no backend.
- **Private by design.** Your resume content is never uploaded anywhere. There
  is no analytics that transmits your data.
- **Free forever.** Deploys as a static site to any free tier — zero server
  cost means no reason to charge you.
- **ATS-friendliness is a first-class feature**, not an afterthought.

## What works today

- ✅ Multi-section editor: Basics, Experience, Education, Skills, Projects,
  Certificates.
- ✅ **Live preview that _is_ the PDF.** The on-screen preview and the
  downloaded file are rendered from the exact same component, so they can never
  drift apart.
- ✅ **Four templates** with instant switching from the preview pane —
  **ATS Classic**, **Modern**, and **Compact** (all single-column, ATS-safe),
  plus **Designer** (two-column; flagged as potentially ATS-risky). Every
  template renders the same `ResumeData`, so switching never loses data.
- ✅ One-click **Download PDF** with real, selectable, machine-readable text.
- ✅ **Import an existing resume** (PDF / DOCX / TXT). The file is read in your
  browser, parsed into structured fields, and shown in a "Review what we
  imported" step before anything is applied — nothing is committed silently.
- ✅ **ATS check** — a self-check that renders your real PDF, reads the text
  back, and re-parses it to confirm every field survives; plus paste a job
  description to get a **keyword-coverage score** with matched/missing terms,
  and flags for common issues (missing email/phone, multi-column template,
  over-long lines, text-as-image).
- ✅ **Autosave** to IndexedDB — your work is restored automatically on reload,
  entirely on-device.
- ✅ **Export / import as JSON** (JSON Resume-friendly), **reorder and hide
  sections**, reorder entries, and a **dark mode** for the app UI (the exported
  resume always stays print-light).
- ✅ **Multiple saved resumes** — keep separate versions tailored to different
  roles and switch between them; all stored locally.
- ✅ **Optional AI bullet helper** — bring your own Anthropic API key (off by
  default, stored only in your browser) to rewrite bullet points. The core flow
  never requires it.
- ✅ Sample content on first load, plus "Start blank" to clear everything.

> Coming next (see [Roadmap](#roadmap)): more templates, an ATS checker,
> job-description keyword matching, autosave, and JSON import/export.

## Importing a resume (Phase 2)

Click **Import** and drop in a `.pdf`, `.docx`, or `.txt` file. The whole
pipeline runs locally:

1. **Text extraction** — PDFs are read with [pdf.js](https://mozilla.github.io/pdf.js/)
   (its worker is served from your own origin, never a CDN), reconstructing real
   line breaks from glyph positions; DOCX is read with
   [mammoth](https://github.com/mwilliamson/mammoth.js). Newlines are preserved
   because the parser's section/entry logic depends on them.
2. **Parsing** — a TypeScript port of a battle-tested field extractor handles
   text normalization, section detection (including slang headers like `SKILLZ`
   / `EXP.`), and multi-strategy email/phone extraction. On top of that, it adds
   **structured per-entry parsing**: each job, degree, project and certificate
   becomes its own editable entry with dates normalized to `YYYY-MM`.
3. **Review** — you see exactly what was found and confirm before it replaces
   your current content. Every field stays fully editable afterwards.

Parsing is **best-effort**: a failure in any one step degrades to an empty field
rather than aborting the import, and **every skill you wrote is preserved** (the
built-in taxonomy only normalizes casing/spelling — it never drops a skill it
doesn't recognize). The parser is covered by
[fixture tests](src/lib/parser/parser.test.ts) (`npm test`).

## Privacy

ResumeForge has **no backend**. Everything — every keystroke, the live preview,
and the final PDF — is computed locally in your browser. Nothing you type is
sent over the network. You can verify this yourself: open your browser's
network tab while editing and downloading; you'll see no requests carrying your
resume data. You can even run it fully offline after the first load. Autosave
keeps your resume in your browser's own IndexedDB storage — on your device, never
uploaded.

## Run it locally

Requires **Node.js 18+**.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Build & self-host

ResumeForge is a fully static site (`output: 'export'`), so hosting is free and
trivial.

```bash
npm run build      # outputs a static site to ./out
```

Serve `./out` with any static file host. A few free options:

- **Vercel** — import the repo; framework preset "Next.js" works out of the box.
- **Cloudflare Pages** — build command `npm run build`, output directory `out`.
- **GitHub Pages / Netlify** — point them at the `out/` directory.
- **Anything** — `npx serve out` locally, or copy `out/` to any web server.

Because it's open source and dependency-light, you can fork it and host your own
instance with no ongoing cost.

## Tech stack

| Concern       | Choice                                            |
| ------------- | ------------------------------------------------- |
| Framework     | Next.js 14 (App Router) + TypeScript (strict)     |
| Static export | `output: 'export'` — no server required           |
| Styling       | Tailwind CSS + shadcn/ui (owned components)       |
| State         | Zustand — one store is the source of truth        |
| PDF + preview | `@react-pdf/renderer` (same doc on screen & file) |
| PDF import    | `pdfjs-dist` (worker self-hosted, no CDN)         |
| DOCX import   | `mammoth`                                         |
| Autosave      | IndexedDB via `idb` (local-only)                  |
| Tests         | Vitest (parser, ATS, JSON round-trip)             |
| Icons         | lucide-react                                      |

The heavy PDF renderer, pdf.js, and mammoth are all lazy-loaded / code-split, so
the initial page stays fast (~133 kB first load) and import code is only fetched
when you actually import.

### Data model

The single source of truth is a [JSON Resume](https://jsonresume.org/schema/)–
shaped `ResumeData` object (see [`src/lib/resume/types.ts`](src/lib/resume/types.ts)).
The form edits it, every template reads it, and the importer (Phase 2) will fill
it. Keeping one canonical model is what lets the live preview and the export stay
perfectly in sync.

## Project structure

```
src/
  app/                     Next.js app router (layout, page, global styles)
  components/
    editor/                The form: Workspace, Editor tabs, section editors,
                           resume manager, sections (reorder/hide), more menu
    import/                Import dropzone + "Review what we imported" dialog
    ats/                   ATS checker dialog (self-check + JD match)
    ai/                    Optional BYOK "Improve with AI" button + settings
    pdf/                   PDF document, templates, live viewer, download, switcher
    ui/                    shadcn/ui primitives (button, input, dialog, …)
  lib/
    resume/                Canonical types, factories, formatting, section order
    parser/                Resume text parser (normalize, sections, name,
                           contact, skills, dates, structured entries) + tests
    import/                Client-side file → text extractors (pdf, docx)
    ats/                   ATS self-check + JD keyword coverage + issue flags + tests
    persist/               IndexedDB autosave (multi-doc) + JSON import/export
    ai/                    BYOK Anthropic client + key store (optional)
    store.ts               Zustand store (source of truth)
scripts/
  copy-pdf-worker.mjs      Copies the pdf.js worker into public/ (predev/prebuild)
```

## Roadmap

- **Phase 1 — MVP** ✅ manual entry → live preview → ATS PDF export _(done)_
- **Phase 2 — Import** ✅ PDF/DOCX/TXT → parse → review → pre-filled form _(done)_
- **Phase 3 — Templates** ✅ ATS Classic / Modern / Compact / Designer + instant switching _(done)_
- **Phase 4 — ATS checker** ✅ self-check round-trip + JD keyword coverage + issue flags _(done)_
- **Phase 5 — Polish & portability** ✅ autosave (IndexedDB), multiple saved
  resumes, JSON import/export, section reorder + visibility, entry reordering,
  dark-mode app UI, a11y/responsive _(done)_
- **Optional AI helper** ✅ bring-your-own-key bullet rewriter, off by default _(done)_

## License

[MIT](LICENSE) — free to use, fork, and self-host.
