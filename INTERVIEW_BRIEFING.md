# ResumeForge — Technical Interview Briefing

> **Grounding:** Every claim below was verified against the actual repository code
> (HEAD commit `b435da1`). Items that could not be verified from the repo are marked
> **UNKNOWN**. This document is intended to be handed to another assistant or read as
> interview prep — treat the code citations as the source of truth, not this prose.

---

> ⚠️ **README ACCURACY WARNING (read first).** `README.md` is significantly stale and
> **will get you caught** if you quote it. Concrete contradictions vs. the actual code:
>
> | README claims | Code reality | Evidence |
> |---|---|---|
> | "**Four templates**" (ATS Classic, Modern, Compact, Designer) | **12 templates** | `src/components/pdf/templates/*.tsx` (12 files) + `TEMPLATES` in `templates/meta.ts` |
> | "Optional AI bullet helper — bring your own **Anthropic** API key" | **3 providers**: Anthropic, OpenAI, Gemini | `src/lib/ai/store.ts` `AI_PROVIDERS` |
> | "~**133 kB** first load" | Shared chunk **88.2 kB**; `/` route first-load **~200 kB** | `npm run build` output |
> | Roadmap ends at "Phase 5 + AI helper" | Also has: cover letter, tailor-for-job, command palette, template gallery, bullet library, score dashboard, PWA/offline, web-worker rendering, editable section headings | git log + `src/` |
>
> Talk from the code, not the README. If asked "is your README current?" the honest
> answer is: *"No — it documents an earlier phase; the app grew past it and I haven't
> back-filled the docs."*

---

## 1. ONE-LINE SUMMARY

A free, no-login resume builder that runs **entirely in the browser** — you fill in a
form, see a live PDF preview that *is* the downloadable file, and everything (editing,
parsing an uploaded resume, PDF generation) happens on your own device with nothing sent
to a server.

---

## 2. THE PROBLEM

- **Real problem:** Mainstream resume builders (Zety, Resume.io, etc.) paywall the PDF
  export, require signup, harvest resume data, and often emit PDFs that Applicant
  Tracking Systems (ATS) can't parse. Job-seekers — especially students/new grads — need
  a free, private tool that produces machine-readable resumes.
- **What existed & why it fell short** (`README.md` lines 14–24 + feature code): paid
  builders lock export; "free" ones monetize data; many produce image-based or
  multi-column PDFs that break ATS keyword extraction. ResumeForge's differentiator is
  **no backend at all** (privacy is structural, not a promise) plus **ATS-friendliness as
  a first-class, testable feature** (`src/lib/ats/`).
- Honest caveat: this is a **portfolio/solo project**, not a product with users. Don't
  imply traction you can't back up.

---

## 3. ARCHITECTURE

**Everything runs client-side.** There is no server, no database server, no API backend.
Verified: **no `src/app/api/` directory exists**, and `next.config.mjs` sets
`output: "export"` during production build (static HTML/JS only).

### Where each piece runs

| Piece | Runs where | Evidence |
|---|---|---|
| Form editing / state | Browser (main thread) | `src/lib/store.ts` (Zustand) |
| Live preview + PDF generation | Browser **Web Worker** (falls back to main thread) | `src/lib/pdf/render.ts`, `src/workers/resume-pdf.worker.ts` |
| Resume import (PDF/DOCX/TXT → text → fields) | Browser (pdf.js has its own worker) | `src/lib/import/`, `src/lib/parser/` |
| Persistence (autosave, multi-doc, snapshots, tracker) | Browser **IndexedDB** | `src/lib/persist/db.ts` |
| AI features (bullet rewrite, summary, cover letter, tailor) | Browser → **directly** to the user's chosen AI provider | `src/lib/ai/*` |
| Static export / worker copy | **Build-time** (Node) | `scripts/copy-pdf-worker.mjs` via `predev`/`prebuild` |

### ASCII flow

```
                          ┌─────────────────────────────────────────────┐
                          │                 BROWSER                      │
                          │                                              │
  User types ──▶ Editor (React) ──▶ Zustand store (store.ts) ═══════════╗│
                          │          - single ResumeData object          ║│
                          │          - undo/redo (past[]/future[])        ║│
                          │                    │ (400ms debounce)         ║│
                          │                    ▼                          ║│
                          │         renderResumePdf() ──postMessage──▶ Web Worker
                          │         (render.ts, lane-coalesced)      (resume-pdf.worker.ts)
                          │                    ▲                       │  │
                          │              PDF blob (ArrayBuffer) ◀──────┘  │
                          │                    │                          │
                          │          ┌─────────┴──────────┐               │
                          │          ▼                    ▼               │
                          │   iframe live preview    Download / Print /   │
                          │   (+ pdfjs page count)   ATS self-check        │
                          │                                              ║│
   Import file ──▶ extract.ts ──▶ pdf.js / mammoth ──▶ parser/ ══════════╝│
   (PDF/DOCX/TXT)         │       (text + heading hints)  (ResumeData)     │
                          │                                              │
   autosave (600ms) ──▶ IndexedDB "kv" store (doc:/snap:/app: keys)     │
                          │                                              │
   AI (opt-in, BYOK) ──▶ fetch() ─────────────────────────────────────▶ (external: Anthropic/OpenAI/Gemini)
                          └─────────────────────────────────────────────┘
```

### Major modules & single responsibility

| Module | Responsibility |
|---|---|
| `src/lib/store.ts` | Single source of truth: the `ResumeData` object + all mutations + undo/redo |
| `src/lib/resume/types.ts` | Canonical data model (JSON Resume–shaped) |
| `src/lib/resume/theme.ts` | Accents, fonts, bullet glyphs, density → concrete style values |
| `src/lib/resume/sections.ts` | Section order resolution + section-title labels |
| `src/components/pdf/templates/*` | 12 React-PDF templates, all rendering the same `ResumeData` |
| `src/lib/pdf/render.ts` | Worker orchestration, render coalescing, main-thread fallback |
| `src/workers/resume-pdf.worker.ts` | Off-main-thread PDF generation |
| `src/lib/import/extract.ts` | File → text dispatcher + validation (size/MIME) |
| `src/lib/parser/*` | Raw text → structured `ResumeData` (normalize, sections, entries, dates, skills) |
| `src/lib/ats/*` | ATS score, JD keyword coverage, round-trip self-check |
| `src/lib/persist/db.ts` | IndexedDB CRUD (multi-doc, snapshots, tracker) |
| `src/lib/ai/*` | BYOK multi-provider AI client |

---

## 4. FULL TECH STACK

**21 production dependencies, 14 dev dependencies** (from `package.json`).

### Languages / Frameworks
| Name | Version | Used for | Why over alternative |
|---|---|---|---|
| TypeScript | `^5` | Whole codebase, strict mode (`tsconfig.json` `"strict": true`, `target: ES2020`) | Type safety on a large single-model app |
| Next.js | `14.2.35` (pinned) | App Router, static export (`output: "export"`) | **Pinned to 14 / React 18 deliberately** — `@react-pdf/renderer` has had React 19 friction |
| React / React-DOM | `^18` | UI | — |
| Tailwind CSS | `^3.4.1` | Styling | Utility CSS; shadcn/ui components are copied into `src/components/ui/`, not a dependency |

### Libraries
| Name | Version | Used for (file) | Notes |
|---|---|---|---|
| `@react-pdf/renderer` | `^4.5.1` | PDF generation + preview (`workers/resume-pdf.worker.ts`, `components/pdf/`) | Renders the **same** document to screen and file → they can't drift |
| `pdfjs-dist` | `^6.0.227` | Read imported PDFs + rasterize preview pages + count pages (`lib/import/pdf.ts`, `components/pdf/PdfImagePreview.tsx`) | Worker **self-hosted** in `public/`, never CDN |
| `mammoth` | `^1.12.0` | DOCX → text (`lib/import/docx.ts`) | Standard for .docx text extraction |
| `docx` | `^9.7.1` | **Export** to Word (`lib/export/docx.ts`) | — |
| `zustand` | `^5.0.14` | State (`lib/store.ts` + small UI/AI/save stores) | Chosen over Redux — far less boilerplate for one store |
| `idb` | `^8.0.3` | IndexedDB promise wrapper (`lib/persist/db.ts`) | Thin ergonomic wrapper over raw IndexedDB |
| `@radix-ui/*` (6 pkgs) | dialog/dropdown/label/separator/slot/tabs | Accessible UI primitives under `components/ui/` | shadcn/ui foundation |
| `lucide-react` | `^1.17.0` | Icons | ⚠️ **Unusually old major (1.x)** — lacks some icons (e.g. no `Linkedin`, used `Link2`) |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate` | — | Class composition / variants / animations | Standard shadcn stack |
| `@vercel/analytics` | `^2.0.1` | Pageview analytics (`app/layout.tsx`) | ⚠️ **Note for the "no analytics" privacy claim** — see §9 |

### Dev / Test tooling
| Name | Version | Used for |
|---|---|---|
| `vitest` | `^4.1.8` | Test runner (`vitest.config.ts`, `environment: "node"`) |
| `@vitejs/plugin-react` | `^6.0.2` | JSX in tests |
| `eslint` + `eslint-config-next` | `^8` / `14.2.35` | Linting (`npm run lint`) |
| `typescript`, `@types/*` | — | Types |
| `postcss` | `^8` | Tailwind pipeline |

### ⚠️ Installed but UNUSED (flag these — a reviewer will spot them)
- **`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`,
  `jsdom`** — **no test file imports any of them** (grep for `testing-library` in
  `*.test.*` = 0 matches), and `vitest.config.ts` uses `environment: "node"` (not jsdom).
  All tests are pure-logic. These 4 devDeps are dead weight — there are **zero React
  component tests**.

---

## 5. KEY TECHNICAL DECISIONS ← most important

### 5.1 One `ResumeData` object is the single source of truth; every template reads it
- **Decision:** Model the resume once (JSON Resume–shaped, `src/lib/resume/types.ts`),
  edit it in one Zustand store, and have all 12 templates render *that same object*.
- **Alternatives:** Per-template data shapes; form state scattered across components.
- **Tradeoff:** Switching templates never loses data and preview==export by construction.
  Cost: every template must handle every field, so adding a field (e.g. `bulletStyle`,
  `sectionTitles`) means threading it through all 12 templates.
- **Evidence:** `types.ts` (`ResumeData`), `store.ts`, `templates/registry.ts`.
- **Wrong when:** templates diverge structurally enough that a shared model becomes a
  lowest-common-denominator straitjacket.

### 5.2 The live preview **is** the export (same React-PDF document)
- **Decision:** Preview and download both go through `renderResumePdf()` → the same
  `ResumeDocument`.
- **Alternatives:** HTML/CSS preview + separate PDF generator (fast preview, but preview
  and file drift).
- **Tradeoff:** Zero drift; but PDF layout is CPU-heavy, so live preview is expensive
  (drove decisions 5.3 & 5.4).
- **Evidence:** `lib/pdf/render.ts`, `README.md` line 30.
- **Wrong when:** you need an instant sub-16ms preview and can tolerate preview≠export.

### 5.3 Render PDFs in a **Web Worker** with a main-thread fallback
- **Decision:** `pdf().toBlob()` runs in `resume-pdf.worker.ts`; `render.ts` posts data,
  gets an `ArrayBuffer` back (transferable). If the worker fails to start or crashes
  (`onerror`), a `workerBroken` flag routes all future renders to the main thread.
- **Alternatives:** Always render on the main thread (jitters while typing); `<PDFViewer>`
  iframe (couldn't share the blob for page counting).
- **Tradeoff:** Typing stays smooth; cost is message-passing + a fallback path to maintain.
- **Evidence:** `lib/pdf/render.ts` lines 25–84.
- **Wrong when:** the target environment lacks Workers, or renders are trivially cheap.

### 5.4 Per-lane **render coalescing** (latest-wins)
- **Decision:** Preview renders use a named "lane"; within a lane **at most one render
  runs and one waits** — a burst of keystrokes only renders the newest state. Displaced
  requests reject with a custom `RenderSuperseded` error that callers swallow.
- **Alternatives:** Debounce only (still renders every settled state); a full queue
  (renders stale intermediates).
- **Tradeoff:** ~2 renders for a fast burst instead of N; cost is a small custom scheduler
  and an error class the UI must special-case.
- **Evidence:** `lib/pdf/render.ts` lines 94–147.
- **Wrong when:** every intermediate render matters (it doesn't for a preview).

### 5.5 IndexedDB **single object store + namespaced keys** (no schema migrations)
- **Decision:** One store `"kv"` at `DB_VERSION = 1`; resumes (`doc:<id>`), snapshots
  (`snap:…`), tracker entries (`app:…`), and `active-id` all live in it.
- **Alternatives:** One object store per entity (needs a version bump + migration to add
  a feature).
- **Tradeoff:** New features never require an IndexedDB migration; cost is you lose
  per-store indexes and do key-prefix filtering in JS (`listDocs` filters
  `startsWith("doc:")`).
- **Evidence:** `lib/persist/db.ts` lines 11–64.
- **Wrong when:** you have large collections needing indexed range queries.

### 5.6 Undo/redo via **whole-object snapshots** with time-based coalescing
- **Decision:** Every mutation `structuredClone`s the resume; `past[]`/`future[]` hold
  snapshots; bursts within `COALESCE_MS = 600` collapse into one history step;
  `HISTORY_LIMIT = 60`.
- **Alternatives:** Command/diff-based undo (memory-cheap, complex); Immer patches.
- **Tradeoff:** Dead-simple and correct; cost is memory — 60 deep clones of the whole
  resume.
- **Evidence:** `store.ts` lines 53–55 + `mutate`/`undo`/`redo`.
- **Wrong when:** the document is large (MBs) and 60× clones blow memory.

### 5.7 BYOK, **browser-direct** multi-provider AI
- **Decision:** AI is opt-in; the user's key is stored only in `localStorage`; the browser
  calls the provider **directly** (`anthropic-dangerous-direct-browser-access` header for
  Anthropic), never a relay.
- **Alternatives:** A backend proxy (would break the "no server" architecture and see user
  keys).
- **Tradeoff:** Preserves zero-backend + privacy; cost is the key sits in `localStorage`
  (XSS-exposed — the code warns and offers "session-only", commit `6fe23b0`) and
  CORS/rate-limits are the provider's.
- **Evidence:** `lib/ai/store.ts`, `lib/ai/improve.ts`.
- **Wrong when:** you can't trust the client with keys or need server-side rate
  limiting/billing.

---

## 6. THE HARD PARTS

### 6.1 Layout-aware PDF import (the genuinely hard algorithm)
`src/lib/import/pdf.ts` (`itemsToPageText`). pdf.js gives you positioned text fragments,
not lines. The parser needs real reading order, which naive top-to-bottom sorting destroys
on two-column/sidebar resumes (it interleaves the columns).
**Say it in 30s:** *"A PDF stores text as scattered fragments with x/y coordinates, not
sentences. I group fragments into rows by y-position, then detect whether the page has two
columns by finding a vertical gap that most rows respect — if I find one, I emit the whole
left column before the right column instead of reading straight across. I also measure the
body font size and treat noticeably larger lines as section headings, which I pass to the
parser as hints."*
Evidence: `import/pdf.ts`, tested in `src/lib/import/pdf.test.ts` (5 tests, incl. a
synthetic two-column page).

### 6.2 Best-effort, fail-soft parser
`src/lib/parser/index.ts` `parseResumeText`. Every extractor is wrapped in
`safe(fn, fallback)` (lines 56–63): if one step throws, that field degrades to empty
instead of aborting the whole import.
**30s:** *"Parsing a stranger's resume is unpredictable, so each field extractor is
isolated — if the date parser chokes on one weird format, you still get the name, email,
and everything else. A partial import beats a failed import."*

### 6.3 ATS keyword-coverage scoring
`src/lib/ats/keywords.ts` (`analyzeCoverage`). Extracts candidate keywords from a pasted
job description (known-skills taxonomy first, then most-frequent non-stopword tokens), then
checks each against the resume text with a **boundary-aware regex** that still matches
`c++`, `.net`, `node.js` (`keywordPresent`, uses `(?<![a-z0-9])term(?![a-z0-9])`).
Coverage = matched/total × 100.
**30s:** *"I pull the important words out of the job description, then check which ones
actually appear in your resume, being careful that `c++` and `.net` match correctly. You
get a percentage and a matched/missing list."*

### 6.4 The ATS "self-check" round-trip (the clever bit)
`src/components/ats/AtsChecker.tsx` renders your **real** PDF → reads the text back out with
pdf.js → re-parses it → confirms your fields survived the PDF encoding. It dogfoods the
whole pipeline to prove the export is machine-readable.

### 6.5 Concurrency / async / error handling
- **Async:** all rendering, import, IndexedDB, AI are `Promise`-based.
- **Concurrency:** the worker chains renders sequentially; `render.ts` lanes cap in-flight
  work.
- **Error handling:** worker crash → permanent main-thread fallback; `saveDoc` returns
  `boolean` so the save indicator can show "Not saved" honestly; parser `safe()`; storage
  helpers swallow errors so editing never blocks.
- **No retry logic** anywhere — worth admitting.

### 6.6 Git history — best "challenge I faced" stories (from `git log`)
| Commit | Story |
|---|---|
| `5524f4d` "Fix section-reorder preview duplication + improve PDF import extraction" | **Strongest story.** React-PDF reuses one reconciler instance; reordering keyed sibling sections made it **duplicate** them in the preview. This drove the whole rendering redesign (worker + fresh `pdf()` per render eliminates the persistent-reconciler bug at the root). |
| `6fe23b0` / `4d5dace` "security: file size/MIME validation… session-only API key" / "reduce max upload size to 5MB" | Added import validation and a session-only key option after realizing an unbounded upload + a `localStorage` key were risks. |
| `9f81dba` "bug: code bug in ats classic", `f453464` "bug: fixes" | Template rendering bugs. |
| `51a6117` "compt for older iphones (safari)" | Mobile Safari compatibility work. |
| `da63388` "sandbox allow-scripts for highlight mode on deployed site" | An iframe sandbox issue that only appeared on the deployed (not local) site. |

> Caveat for honesty: commit messages are terse ("last edit", "bug: fixes") and history was
> clearly rewritten/squashed at points. Don't over-narrate beyond what a message says.

---

## 7. PERFORMANCE & SCALE

**Optimizations actually in the code:**
- **Web-worker rendering** off the main thread (`render.ts`).
- **Render coalescing** latest-wins per lane (`render.ts`).
- **Idle prewarm** of the worker so first preview isn't cold (`prewarmPdfRenderer`, uses
  `requestIdleCallback`).
- **Debounced** preview (400 ms) and **debounced autosave** (600 ms,
  `useResumePersistence`).
- **Code-splitting / lazy loading:** `@react-pdf/renderer`, `pdfjs-dist`, `mammoth`, `docx`
  are all `await import()`ed only when used (`extract.ts`, `render.ts`, `MoreMenu`).
- **Transferable `ArrayBuffer`** from worker (avoids a copy).
- **`useMemo`** on the merged resume object to avoid infinite re-render loops
  (`LivePreview`).
- **Template thumbnail cache:** `WeakMap<resume, Map<templateId, dataUrl>>` in the gallery.

**Where it breaks at 100×:** There is no "100× users" — it's client-side, so it scales with
*static hosting*, which is trivially horizontal (CDN). The real bottleneck is **per-device
CPU**: `@react-pdf/renderer` layout is the hot path. A very long resume or a low-end phone
makes each render slow; the worker hides jank but not total time. Second bottleneck:
**giant IndexedDB values** — resumes with embedded base64 photos/fonts are stored whole per
keystroke-batch.

**Hard-coded limits:**
| Limit | Value | File |
|---|---|---|
| Import file size | **5 MB** | `import/extract.ts` `MAX_FILE_BYTES` |
| Undo history depth | **60** states | `store.ts` `HISTORY_LIMIT` |
| Edit coalescing window | **600 ms** | `store.ts` `COALESCE_MS` |
| Preview debounce | **400 ms** | `LivePreview.tsx` |
| AI `max_tokens` | 256 (summary) / 1024 (bullets, cover letter) | `lib/ai/*` |

**Performance numbers you can legitimately claim:** first-load **shared JS 88.2 kB**
(build output); `/` route **~200 kB first-load** (observed in-session build). **Do not**
cite the README's "133 kB" — it's stale. Any latency number (e.g. "renders in X ms") is
**UNKNOWN — not benchmarked in the repo**; don't invent one.

---

## 8. TESTING & QUALITY

**Runner:** Vitest, `environment: "node"`, **75 tests across 7 files, all passing**
(from `vitest run`).

| Test file | Covers | Type |
|---|---|---|
| `src/lib/parser/parser.test.ts` | Section detection, dates, entries, skills, old-PDF artifacts (largest suite) | Unit |
| `src/lib/import/pdf.test.ts` | `itemsToPageText` reading order incl. two-column layout, heading hints (5) | Unit |
| `src/lib/ats/ats.test.ts` | Keyword extraction/coverage, round-trip helpers (10) | Unit |
| `src/lib/features.test.ts` | Date formats, completeness, scoring, bullet styles, section labels (18) | Unit |
| `src/lib/persist/json.test.ts` | JSON export/import round-trip + coercion (5) | Unit |
| `src/lib/resume/sections.test.ts` | Section order resolution (3) | Unit |
| `src/lib/store.test.ts` | Store smoke test (**1** — thin) | Unit |

**Two edge-case/failure-path examples to cite:**
1. **Two-column PDF reading order** (`pdf.test.ts`): feeds synthetic positioned glyphs
   arranged in two columns and asserts the parser emits left-column-then-right, not
   interleaved — guards the hardest algorithm.
2. **Old-PDF glyph normalization** (`parser.test.ts`): asserts ligatures (`ﬁ`→`fi`),
   Wingdings/private-use bullets, and hyphenated line-wraps (`develop-\nment`→`development`)
   are repaired — a real failure path from messy exports.

**What is NOT tested (be blunt):**
- **Zero React component / integration / e2e tests.** No render tests, no user-flow tests.
  (The `@testing-library` deps are installed but unused.)
- **No test** for the store's undo/redo, the worker/render pipeline, IndexedDB
  persistence, the AI clients, or any of the 12 templates.
- `store.test.ts` is a single smoke test.

**Quality tooling:** TypeScript **strict** (`tsconfig.json`); ESLint via `next lint`.
**No CI** (no `.github/workflows` in repo — **UNKNOWN if any CI exists on the host**),
**no pre-commit hooks**, **no coverage gate**. Tests are run manually.

---

## 9. SECURITY & DATA HANDLING

- **Auth:** **None.** No accounts, no login, no sessions. Correct for the design.
- **User data storage:** Resume content lives in **IndexedDB on the device**
  (`persist/db.ts`), persisted indefinitely until the user clears it. **Nothing is
  uploaded** for the core flow (no backend exists to receive it).
- **Secrets committed:** **None found** — no `.env`, `.pem`, `.key`, or secret files in the
  repo root. No hardcoded API keys. ✅ AI keys are user-supplied at runtime, stored in
  `localStorage`.
- **Input validation:** Import files are validated for **size (5 MB) and MIME type** before
  parsing (`extract.ts` `validateFile`), with extension fallback. Parser is fail-soft.
- **Security weaknesses a reviewer would flag (be honest):**
  1. **AI key in `localStorage`** — readable by any XSS. Mitigated by an opt-in
     "session-only" mode (commit `6fe23b0`) but the default persists it in plaintext; the
     UI explicitly warns.
  2. **Privacy claim vs. `@vercel/analytics`** — the README says "no analytics that
     transmits your data." Analytics is present in `app/layout.tsx`. It sends
     *pageview/telemetry*, **not resume content**, so the spirit holds — but a careful
     interviewer will catch the wording. Say it plainly: *"Resume data never leaves the
     device; there is anonymous pageview analytics via Vercel, which is fair to flag as
     slightly off-message."*
  3. **`dangerouslySetInnerHTML`** is used in `app/layout.tsx` for JSON-LD/theme script
     (static strings, not user input) — low risk but worth knowing.
  4. **Highlight-mode iframe** needed `sandbox allow-scripts` on deploy (commit
     `da63388`) — a sandboxing subtlety.
  5. No Content-Security-Policy headers defined in-repo (**UNKNOWN** what the host adds).

---

## 10. HONEST WEAKNESSES (senior-review voice)

- **Over-engineered:** 12 templates is a lot of duplicated layout code — each
  re-implements section rendering, bullet threading, section titles. A shared
  section-renderer would cut this dramatically; instead, every new field (`bulletStyle`,
  `sectionTitles`) is a 12-file mechanical edit (error-prone — section titles alone were
  ~72 call sites). The recruiter "agency branding" mode (`AgencyBranding` in `types.ts`)
  is scope creep for a personal resume tool.
- **Under-engineered:** **Testing.** 75 tests but all pure-logic; the highest-risk code
  (rendering pipeline, worker, undo/redo, persistence, 12 templates) has **no tests**. No
  CI. The README is unmaintained.
- **What breaks first in production:** `@react-pdf/renderer` performance on low-end mobile
  with long resumes — the worker hides jank but a 3-page resume still takes real CPU time
  each render. Second: a resume with a large embedded photo/font bloats every IndexedDB
  write and every undo clone.
- **Worst code / what I'd refuse to merge:** The **12-way copy-paste in the templates** is
  the worst smell — a change to section rendering must be made 12 times. In a PR I'd push
  back on adding a *13th* template before extracting a shared renderer. Also flag the **4
  unused `@testing-library` deps** and the **stale README** as merge blockers.
- **Data-model debt:** `ResumeMeta` has grown to ~20 optional fields (`types.ts` 134–168)
  — theme, spacing, fonts, bullets, page size, section titles, agency branding all in one
  flat bag. It works but it's becoming a junk drawer.

---

## 11. WHAT I'D DO NEXT (impact-to-effort)

1. **Extract a shared template section-renderer** — kills the 12× duplication; every
   future field becomes a 1-file change. *Highest leverage.*
2. **Add component/integration tests + CI** (GitHub Actions running `tsc + vitest +
   build`) — the risky rendering/persistence paths are untested; direct Honeywell-JD hit
   (CI/CD, software quality).
3. **Rewrite the README to match reality** (12 templates, 3 AI providers, real first-load
   number) — cheap, removes the single biggest "gotcha."
4. **Benchmark render time** and put a real number on it — currently can't claim latency.
5. **Move the AI key out of default `localStorage`** to session-only by default — small
   change, meaningfully better security posture.

---

## 12. LIKELY INTERVIEW QUESTIONS (easy → hard)

1. **What does it do?** → Browser-only resume builder; form → live PDF preview that is the
   export; import + parse existing resumes; ATS checks. (§1)
2. **Why no backend?** → Privacy is structural (data can't leak if there's no server), and
   it deploys free as static (`output: "export"`). (§3)
3. **Where's the data stored?** → IndexedDB on-device, indefinitely; nothing uploaded for
   the core flow. (`persist/db.ts`)
4. **State management choice?** → Zustand, one `ResumeData` store as source of truth; Redux
   would be boilerplate-heavy for one store. (§5.1)
5. **How do preview and download stay in sync?** → They render the *same* React-PDF
   document via `renderResumePdf()`. (§5.2)
6. **⚠️ (exposes skimmers) Where exactly does PDF generation run, and what happens if the
   Web Worker fails?** → In `resume-pdf.worker.ts`; on `onerror`, a `workerBroken` flag
   permanently routes to a main-thread fallback and rejects in-flight renders.
   (`render.ts` 50–56) — *skim-readers will say "in the browser" and miss the fallback.*
7. **⚠️ Undo/redo — how's it implemented and what does it cost?** → Whole-object
   `structuredClone` snapshots, 600 ms coalescing, 60-deep — simple but memory-heavy.
   (`store.ts` 53–55) — *a skimmer won't know it's snapshot-based, not diff-based.*
8. **⚠️ How does resume import handle a two-column PDF?** → Detects a column gutter from
   glyph x-positions and emits left-column-then-right; naive sorting would interleave.
   (`import/pdf.ts`, tested) — *skimmers think it's just "pdf.js gives text".*
9. **How do you keyword-match against a job description?** → Extract JD keywords (taxonomy
   + frequency), boundary-aware regex match that handles `c++`/`.net`, coverage %.
   (`ats/keywords.ts`)
10. **Test coverage — honestly?** → 75 unit tests, all pure-logic; **no** component/e2e
    tests, no CI. *(Mark: this is a real limitation — say so.)*
11. **⚠️ Your README says four templates — how many are there?** → **12**; the README is
    stale. *(Trap; the honest answer scores points.)* — *skim-readers repeat "four".*
12. **Biggest bug you fixed?** → React-PDF reconciler duplicated reordered sections in the
    preview (`5524f4d`); fixed by rendering a fresh `pdf()` per request in a worker. (§6.6)
13. **How would this scale to 100k users?** → It's static + client-side, so hosting scales
    via CDN for free; the real limit is per-device CPU for `@react-pdf` layout, not a
    server. (§7)
14. **Security holes?** → AI key in `localStorage` (XSS-exposed, opt-in session-only
    mitigation); analytics present despite "no analytics" wording; no auth by design. (§9)
15. **If you added user accounts + cloud sync tomorrow, what breaks?** → The entire
    privacy/no-backend thesis; you'd need a server, auth, encryption-at-rest, a real DB,
    and IndexedDB→server migration — a different architecture. *(Honest: "that's a rewrite,
    not a feature.")*

**"I don't know / limitation" answers to own up front:** #10 (no CI/component tests), #14
(localStorage key), and any *measured latency* question (not benchmarked).

---

## 13. NUMBERS SHEET

| Fact | Value | Status |
|---|---|---|
| Source files (`.ts`/`.tsx` in `src`) | **141** | MEASURED |
| Lines of code (`src`) | **21,760** | MEASURED |
| Tests / test files | **75 / 7** | MEASURED (vitest run) |
| Git commits | **46** | MEASURED |
| PDF templates | **12** | MEASURED |
| Production dependencies | **21** | MEASURED |
| Dev dependencies | **14** (4 unused) | MEASURED |
| Backend API endpoints | **0** | MEASURED (no `app/api`) |
| IndexedDB object stores | **1** (`kv`, namespaced keys) | MEASURED |
| AI providers | **3** (Anthropic/OpenAI/Gemini) | MEASURED |
| Import formats | **3** (PDF/DOCX/TXT) | MEASURED |
| Export formats | PDF, DOCX, TXT, JSON | MEASURED |
| Date formats | **5** | MEASURED (`types.ts` `DateFormat`) |
| Page sizes | **2** (Letter/A4) | MEASURED |
| Import size limit | **5 MB** | MEASURED |
| Undo depth / coalesce | **60 / 600 ms** | MEASURED |
| Shared first-load JS | **88.2 kB** | MEASURED |
| `/` route first-load | **~200 kB** | MEASURED (in-session; README's 133 kB is stale) |
| Render latency | — | **UNKNOWN — not benchmarked** |

---

## 14. THE 60-SECOND PITCH

> "So the problem is: most resume builders make you pay to download your own resume, they
> store your data on their servers, and a lot of them produce PDFs that the automated
> systems companies use to screen resumes literally can't read. I built ResumeForge to fix
> all three. It's a resume builder that runs **entirely in your browser** — there's no
> server at all. You fill in a form, and you see a live preview that is *literally the same
> file* you'll download, so what you see is exactly what you get.
>
> The interesting technical decision was how the PDF gets generated. Generating a PDF is
> CPU-heavy, and doing it on every keystroke made the app stutter. So I moved PDF
> generation into a **Web Worker** — a background thread — and added a scheduler that, if
> you type fast, throws away the intermediate versions and only renders the latest one.
> Typing stays smooth. And if the background thread ever fails, it automatically falls back
> to the main thread so it never just breaks.
>
> It's about **21,000 lines of TypeScript with 75 passing tests**, and it deploys as a
> completely static site — which means hosting is free and it scales on a CDN.
>
> What would I do differently? Two things, honestly. There are 12 resume templates that
> share a lot of copy-pasted layout code — I'd refactor that into one shared renderer so
> adding a feature isn't a 12-file change. And the tests only cover the pure logic — the
> parsing, the scoring — but not the UI or the rendering pipeline, and there's no CI. So if
> this were going to production, wiring up automated testing on every commit would be my
> first move."

---

## HONEYWELL JD MAPPING

Only real connections — stretches are flagged as stretches.

| JD point | Real connection in this repo? |
|---|---|
| **DSA fundamentals** | ✅ **Genuine.** PDF column-detection (`import/pdf.ts`) and boundary-aware keyword matching (`ats/keywords.ts`) are real algorithm work you can whiteboard. |
| **OOP fundamentals** | 🟡 **Weak.** Mostly functional TS + React. Some classes (`RenderSuperseded`, error classes). Don't lead with OOP. |
| **Testing & software quality** | ✅ **Partial, be honest.** 75 Vitest unit tests + strict TypeScript — but no component/e2e tests and no CI. Frame as "I know what good looks like and where this falls short." |
| **REST APIs / microservices** | ❌ **Do not claim.** No backend, no REST API, no microservices. AI calls are client→third-party `fetch`. If asked: "this project is deliberately backend-less; my REST/microservice experience is from [elsewhere]." |
| **SQL/NoSQL databases** | 🟡 **NoSQL-adjacent only.** IndexedDB is a client-side key-value store (`persist/db.ts`) — discuss key-value modeling, namespacing, why you avoided migrations. **Not** a server DB, **no SQL**. |
| **Cloud-native / Azure/AWS** | ❌ **Do not claim.** Deploys as static to Vercel/Cloudflare/GH Pages. No cloud services, no containers. |
| **CI/CD & DevOps / Docker / K8s** | ❌ **None in repo.** No CI, no Dockerfile, no K8s. Best move: cite as *"what I'd do next"* (§11 #2) — shows you know it's missing. |
| **SDLC / Agile / Git workflows** | ✅ **Genuine, modestly.** 46 commits, phased roadmap (Phase 1–5), feature-branch-style history, security-driven fixes. Solo, so no PR review — say so. |
| **AI/ML (preferred)** | ✅ **Real but shallow.** BYOK integration of 3 LLM providers (`lib/ai/`) for bullet rewriting/summaries/cover letters/JD tailoring — you *consume* models, you don't train them. Frame as "LLM application integration," not "ML." |
| **Big Data (preferred)** | ❌ **Do not claim.** Single-document, client-side. No stretch available. |

**Bottom line:** Strongest honest hits are **DSA (parser/column-detection), Git/SDLC
discipline, and LLM integration**. Honest gaps are **REST/microservices, cloud-native,
containers, and CI/CD** — the mature play is to name those as gaps and point to §11 as what
you'd build next, rather than stretching this project to cover them.

---

### Two explicit UNKNOWNs — do not state a number for either
1. **Render latency** — nothing in the repo benchmarks it.
2. **CI on the hosting side** — no workflow files in-repo; whether the host runs any is
   unverified.
