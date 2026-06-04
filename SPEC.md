# Build Spec — A Free, Open, ATS-Friendly Resume Builder

Pick your own product name (e.g. FreeResume, ResumeForge, OpenCV-Builder). Replace [APP_NAME] below.

> Implementation note: this project is named **ResumeForge**.

## 1. Mission & context

Build a free, no-signup, privacy-first resume builder for the web. The ethos is the same as ilovepdf — genuinely free for everyone, no paywall, no account required to use the core features.
A user can:

- Enter their details in a form, OR upload an existing resume (PDF or DOCX) which is parsed and used to pre-fill the form.
- See a live preview that updates in real time as they edit.
- Choose from multiple templates, including ATS-safe and more visual "designer" ones.
- Download a polished, ATS-friendly PDF (and export their data as JSON).

This is a separate greenfield project. There is an existing C# ATS field-extractor (ResumeParsingService.cs) provided as a reference for parsing logic only — see §6. Do not depend on it at runtime.

## 2. Non-negotiable principles

- **100% client-side.** All parsing, rendering, and PDF generation happen in the browser. No backend is required for the core product.
- **Zero server cost.** Must deploy as a static site to a free tier (Vercel or Cloudflare Pages).
- **No login required** for the core flow (build → preview → export).
- **Privacy.** The user's resume data must never leave their browser. No analytics that transmit resume content. State this clearly in the UI and README.
- **ATS-friendliness is a first-class feature**, not a footnote.

## 3. Tech stack (use exactly this unless there's a strong reason not to)

- Framework: Next.js (App Router) + TypeScript, configured for static export (output: 'export').
- Styling (app UI): Tailwind CSS + shadcn/ui for the editor chrome (buttons, inputs, tabs, dialogs).
- State: Zustand (lightweight, modern). Redux Toolkit is an acceptable alternative if you prefer — one global store is the source of truth for the resume.
- PDF parsing: pdfjs-dist (PDF.js) — client-side text + position extraction.
- DOCX parsing: mammoth — client-side DOCX → text.
- PDF generation + preview: @react-pdf/renderer.
- Persistence: IndexedDB via idb (fall back to localStorage if simpler).
- Data model: JSON Resume schema (https://jsonresume.org/schema/) — see §4.
- Testing: Vitest + React Testing Library; fixture-based tests for the parser. Playwright e2e optional.
- Quality: ESLint + Prettier, TypeScript strict mode.

Critical architecture note: Use @react-pdf/renderer's `<PDFViewer>` for the live preview so the preview is the PDF — never build a separate HTML preview that can drift from the exported file. The same React-PDF document component must render both on screen and in the download. pdfjs-dist and @react-pdf/renderer are heavy — lazy-load/code-split them so the initial page stays fast.

## 4. Canonical data model (single source of truth)

The form edits this, the parser fills this, every template reads this. Base it on JSON Resume:

```typescript
interface ResumeData {
  basics: {
    name: string;
    label: string;            // e.g. "Full-Stack Developer"
    email: string;
    phone: string;
    url: string;
    location: { city: string; region: string; countryCode: string };
    profiles: { network: string; username: string; url: string }[]; // GitHub, LinkedIn...
    summary: string;
  };
  work: {
    name: string;             // company
    position: string;
    location: string;
    url: string;
    startDate: string;        // "YYYY-MM"
    endDate: string;          // "YYYY-MM" or "" = present
    summary: string;
    highlights: string[];     // bullet points
  }[];
  education: {
    institution: string;
    area: string;             // field of study
    studyType: string;        // degree, e.g. "B.Tech"
    startDate: string;
    endDate: string;
    score: string;            // GPA / percentage
    courses: string[];
  }[];
  projects: {
    name: string;
    description: string;
    highlights: string[];
    url: string;
    keywords: string[];
  }[];
  skills: {
    name: string;             // category, e.g. "Languages"
    keywords: string[];       // e.g. ["Python", "JavaScript"]
  }[];
  certificates: {
    name: string;
    issuer: string;
    date: string;
    url: string;
  }[];
  meta: { template: string; lastModified: string };
}
```

## 5. Build phases (ship a working app at the end of each)

### Phase 0 — Scaffold

- Next.js + TS + Tailwind + shadcn/ui, ESLint/Prettier, static export configured.
- Define the ResumeData type and the Zustand store.
- Acceptance: app runs, empty editor renders, store updates on input.

### Phase 1 — MVP: manual entry → live preview → PDF export

- A multi-section form (Basics, Work, Education, Skills, Projects, Certificates) bound to the store.
- One ATS Classic template (single column) built with @react-pdf/renderer.
- Live `<PDFViewer>` preview beside the form.
- Download PDF button.
- Acceptance: user fills the form, sees it render live, downloads a PDF with real selectable text.

### Phase 2 — Resume import (PDF + DOCX → structured prefill)

- Drag-and-drop / file picker accepting .pdf and .docx.
- Extract text client-side (PDF.js / mammoth), run the parser (§6), pre-fill the form.
- A "Review what we imported" step — parsed data is editable; nothing is committed silently.
- Never block on a parse failure; degrade to a partially filled or empty form gracefully.
- Acceptance: uploading a real resume pre-fills name, contact, skills, and structured per-entry work/education.

### Phase 3 — Template gallery + switcher

- A template picker; switching re-renders the same ResumeData instantly.
- Build at least: ATS Classic (default, single column), Modern (single column, subtle accent), Compact (fits more on a page), Designer (two-column, clearly labeled "best for human reviewers / portfolios, may reduce ATS compatibility").
- Acceptance: four templates, instant switching, no data loss.

### Phase 4 — ATS checker

- Self-check (dogfooding): re-run the generated resume's text through the parser; if all key fields extract cleanly, show a green "ATS-readable" badge.
- Job-description match: paste a JD → keyword match against the resume → show matched/missing keywords + a coverage score.
- Issue flags: missing email/phone, over-long lines, multi-column when an ATS-safe template was expected, any text-as-image.
- Acceptance: pasting a JD returns a meaningful keyword coverage report.

### Phase 5 — Polish & portability

- Auto-save to IndexedDB; restore on reload; support multiple saved resumes (versions).
- Export/import the ResumeData as a .json file (interoperable with the JSON Resume ecosystem).
- Drag-to-reorder sections and entries; toggle section visibility.
- Dark mode for the app UI only — the exported resume stays print-appropriate (light).
- Accessibility (semantic HTML, labels, keyboard nav, focus states) and responsive layout.
- Acceptance: refresh-safe, importable/exportable, accessible, mobile-usable.

## 6. The parser (the hard part — read carefully)

A reference C# file (ResumeParsingService.cs) is provided. Port its proven logic to TypeScript, then add what it lacks.

Port these (they're well-built and language-agnostic):

- Text normalization — strip BOM/zero-width chars/soft hyphens, normalize curly quotes, normalize all dash and bullet glyphs to single canonical characters, collapse same-line whitespace while preserving newlines (use the equivalent of [^\S\n], never \s, so line structure survives — everything downstream depends on it).
- Section detection — full-line + short-prefix + slang/abbreviation header matching; drop decoration-only lines.
- Email & phone extraction — keep the multi-strategy approach and fallbacks. Keep India-format handling but make it one of several formats, not the only first-class one (this tool is global).
- Skill taxonomy with boundary-aware matching (e.g. "go" must not fire inside "google", ".net" not inside "asp.net").

Add what the C# version does NOT have (this is the net-new work that makes it a builder import, not an ATS extractor):

- Structured per-entry parsing. The reference returns Experience as one text blob and discards Education/Projects/Summary. You must instead produce arrays:
  - each work entry → { name, position, location, startDate, endDate, summary, highlights[] }
  - each education entry → { institution, area, studyType, startDate, endDate, score }
  - plus Projects, Certificates, and the Summary.
  - Use the section boundaries + date-range detection to split blobs into individual entries; map bullet lines to highlights[].
- Preserve ALL skills the user wrote. The taxonomy is for normalization and suggestions only — never drop a skill just because it isn't in the list (the reference silently loses unknown skills; do not replicate that).
- Treat parsing as best-effort: always feed results into the editable "review" form.

Write fixture-based tests for the parser using a handful of varied sample resumes (single vs multi-column, different date formats, headerless, slang headers). This is the most brittle component — test it.

## 7. ATS rules the templates must obey

- Single-column layout for all ATS-safe templates.
- Real, selectable text only (React-PDF embeds text — good); never render text as an image.
- Standard section headings (Experience, Education, Skills, Projects).
- No tables, text boxes, or header/footer regions holding critical info.
- Standard fonts; auto-format for consistent sizing, margins, and bullet styles.
- Keep "designer" (multi-column/visual) templates clearly separated and labeled as potentially ATS-risky.

## 8. Optional AI features (only if time allows, and only this way)

- A "improve / quantify this bullet point" helper using an LLM.
- Must be bring-your-own-API-key (the user enters their own key, stored locally). Never hardcode a paid key — that would break the free promise. Keep it entirely optional and clearly off by default.

## 9. Do NOT

- Add any paid/cloud dependency to the core flow (no mandatory backend, no paid PDF API).
- Process resumes server-side.
- Make signup mandatory.
- Drop skills the taxonomy doesn't recognize.
- Render resume text as images.
- Let the live preview diverge from the exported PDF.

## 10. Deliverables & working style

- Initialize the repo; commit per phase with clear messages.
- A README explaining the free/privacy ethos, how to run locally, and how to self-host (it's open source).
- Parser tests with fixtures.
- At the end of every phase, leave me a runnable app (npm run dev works).
- Keep ResumeData as the single source of truth throughout.
