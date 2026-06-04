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

## What works today (Phase 1 — MVP)

- ✅ Multi-section editor: Basics, Experience, Education, Skills, Projects,
  Certificates.
- ✅ **Live preview that _is_ the PDF.** The on-screen preview and the
  downloaded file are rendered from the exact same component, so they can never
  drift apart.
- ✅ One **ATS Classic** template — single column, standard headings, real
  selectable text, no tables or images.
- ✅ One-click **Download PDF** with real, selectable, machine-readable text.
- ✅ Sample content on first load, plus "Start blank" to clear everything.

> Coming next (see [Roadmap](#roadmap)): import an existing PDF/DOCX résumé,
> more templates, an ATS checker, job-description keyword matching, autosave,
> and JSON import/export.

## Privacy

ResumeForge has **no backend**. Everything — every keystroke, the live preview,
and the final PDF — is computed locally in your browser. Nothing you type is
sent over the network. You can verify this yourself: open your browser's
network tab while editing and downloading; you'll see no requests carrying your
resume data. You can even run it fully offline after the first load.

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
| Icons         | lucide-react                                      |

The heavy PDF renderer is lazy-loaded / code-split so the initial page stays
fast.

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
    editor/                The form: Workspace, Editor tabs, section editors
    pdf/                   PDF document, templates, live viewer, download
    ui/                    shadcn/ui primitives (button, input, tabs, …)
  lib/
    resume/                Canonical types, factories, formatting helpers
    store.ts               Zustand store (source of truth)
```

## Roadmap

- **Phase 1 — MVP** ✅ manual entry → live preview → ATS PDF export _(done)_
- **Phase 2** — import an existing PDF/DOCX résumé and pre-fill the form
- **Phase 3** — template gallery (Modern, Compact, Designer) + instant switching
- **Phase 4** — ATS checker + job-description keyword matching
- **Phase 5** — autosave, multiple saved resumes, JSON import/export,
  drag-to-reorder, dark mode, accessibility polish

## License

[MIT](LICENSE) — free to use, fork, and self-host.
