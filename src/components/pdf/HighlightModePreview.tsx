"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useResumeStore } from "@/lib/store";
import type { HighlightRule, ResumeData } from "@/lib/resume/types";

const COLORS = [
  { id: "yellow", hex: "#fef08a", label: "Yellow" },
  { id: "green", hex: "#bbf7d0", label: "Green" },
  { id: "pink", hex: "#fbcfe8", label: "Pink" },
  { id: "blue", hex: "#bfdbfe", label: "Blue" },
];

/* ---------- helpers ---------- */

/** Wrap all occurrences of `text` in the HTML string with a highlighted span. */
function applyHighlightsToHtml(html: string, rules: HighlightRule[]): string {
  let result = html;
  for (const rule of rules) {
    if (!rule.text.trim()) continue;
    const escaped = rule.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    result = result.replace(
      re,
      `<mark style="background:${rule.color};border-radius:2px;padding:0 1px;" data-highlight="${rule.id}">$1</mark>`
    );
  }
  return result;
}

/** Convert plain text with newlines into safe highlighted HTML. */
function textBlock(text: string, rules: HighlightRule[]): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return applyHighlightsToHtml(safe, rules);
}

/** Build the full resume HTML string from structured data. */
function buildHtml(data: ResumeData, rules: HighlightRule[]): string {
  const { basics, work, education, projects, skills, certificates } = data;

  const h = (t: string) => textBlock(t, rules);

  let html = `<div class="resume-root">`;

  // Header
  html += `<div class="resume-header">
    <h1>${h(basics.name)}</h1>
    ${basics.label ? `<p class="subtitle">${h(basics.label)}</p>` : ""}
    <p class="contacts">
      ${[basics.email, basics.phone, basics.location?.city, basics.url]
        .filter(Boolean)
        .map((v) => h(v))
        .join('<span class="sep">|</span>')}
    </p>
  </div>`;

  // Summary
  if (basics.summary) {
    html += `<div class="resume-section">
      <div class="section-title">Summary</div>
      <p>${h(basics.summary)}</p>
    </div>`;
  }

  // Experience
  if (work.length > 0) {
    html += `<div class="resume-section"><div class="section-title">Experience</div>`;
    for (const w of work) {
      html += `<div class="entry">
        <div class="entry-row">
          <strong>${h(w.name)}</strong>
          <span class="date">${w.startDate}${w.endDate ? ` – ${w.endDate}` : " – Present"}</span>
        </div>
        <div class="entry-row">
          <em>${h(w.position)}${w.location ? ` — ${h(w.location)}` : ""}</em>
        </div>
        ${w.summary ? `<p>${h(w.summary)}</p>` : ""}
        ${
          w.highlights.length > 0
            ? `<ul>${w.highlights.map((b) => `<li>${h(b)}</li>`).join("")}</ul>`
            : ""
        }
      </div>`;
    }
    html += `</div>`;
  }

  // Education
  if (education.length > 0) {
    html += `<div class="resume-section"><div class="section-title">Education</div>`;
    for (const e of education) {
      html += `<div class="entry">
        <div class="entry-row">
          <strong>${h(e.institution)}</strong>
          <span class="date">${e.startDate}${e.endDate ? ` – ${e.endDate}` : ""}</span>
        </div>
        <em>${h(e.studyType)} ${h(e.area)}</em>${e.score ? ` · ${h(e.score)}` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  // Projects
  if (projects.length > 0) {
    html += `<div class="resume-section"><div class="section-title">Projects</div>`;
    for (const p of projects) {
      html += `<div class="entry">
        <strong>${h(p.name)}</strong>
        ${p.description ? `<p>${h(p.description)}</p>` : ""}
        ${p.highlights.length > 0 ? `<ul>${p.highlights.map((b) => `<li>${h(b)}</li>`).join("")}</ul>` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  // Skills
  if (skills.length > 0) {
    html += `<div class="resume-section"><div class="section-title">Skills</div>`;
    for (const s of skills) {
      html += `<p><strong>${h(s.name)}:</strong> ${h(s.keywords.join(", "))}</p>`;
    }
    html += `</div>`;
  }

  // Certificates
  if (certificates.length > 0) {
    html += `<div class="resume-section"><div class="section-title">Certificates</div>`;
    for (const c of certificates) {
      html += `<div class="entry">
        <div class="entry-row">
          <strong>${h(c.name)}</strong>
          <span class="date">${c.date}</span>
        </div>
        <em>${h(c.issuer)}</em>
      </div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13.5px; line-height: 1.55; color: #1a1a1a; padding: 32px 40px; background: #fff; user-select: text; -webkit-user-select: text; }
  .resume-root { max-width: 700px; margin: 0 auto; }
  .resume-header { text-align: center; margin-bottom: 18px; }
  .resume-header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .resume-header .subtitle { color: #555; font-size: 13px; margin-top: 2px; }
  .resume-header .contacts { font-size: 12px; color: #555; margin-top: 6px; }
  .sep { margin: 0 6px; color: #bbb; }
  .resume-section { margin-top: 16px; border-top: 1.5px solid #e2e2e2; padding-top: 10px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 8px; }
  .entry { margin-bottom: 10px; }
  .entry-row { display: flex; justify-content: space-between; align-items: baseline; }
  .date { font-size: 12px; color: #777; white-space: nowrap; margin-left: 12px; }
  p { margin-top: 3px; }
  ul { margin-top: 4px; padding-left: 16px; }
  li { margin-top: 2px; }
  em { color: #444; }
  mark { cursor: pointer; }
`;

/* ---------- Floating picker ---------- */

function FloatingPicker({
  x,
  y,
  onPick,
  onDismiss,
}: {
  x: number;
  y: number;
  onPick: (hex: string) => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  const left = Math.min(Math.max(x - 90, 8), window.innerWidth - 200);
  const top = Math.min(y + 24, window.innerHeight - 60);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      style={{ left, top }}
      className="fixed z-[9999] flex items-center gap-2 rounded-full border bg-white px-3 py-2 shadow-2xl dark:bg-zinc-900 dark:border-zinc-700"
      onMouseDown={(e) => e.preventDefault()}
    >
      <svg
        className="h-3.5 w-3.5 text-zinc-400 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPick(c.hex);
          }}
          className="h-6 w-6 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-125 active:scale-95"
          style={{ backgroundColor: c.hex }}
          title={c.label}
        />
      ))}
      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onDismiss();
        }}
        className="text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors leading-none"
      >
        ✕
      </button>
    </div>
  );
}

/* ---------- Main component ---------- */

export function HighlightModePreview({ data }: { data: ResumeData }) {
  const rules = useMemo(
    () => (data.meta.highlights ?? []) as HighlightRule[],
    [data.meta.highlights]
  );
  const setHighlights = useResumeStore((s) => s.setHighlights);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [picker, setPicker] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const dismiss = useCallback(() => setPicker(null), []);

  // Inject / refresh HTML whenever data or rules change
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const html = buildHtml(data, rules);
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>${CSS}</style></head><body>${html}</body></html>`);
    doc.close();

    // Listen for mouseup INSIDE the iframe
    function handleMouseUp(e: MouseEvent) {
      const iframeWindow = iframeRef.current?.contentWindow;
      const sel = iframeWindow?.getSelection();
      const text = sel?.toString().trim() ?? "";

      if (text.length > 0) {
        // Convert iframe-local coords to page coords
        const iframeRect = iframeRef.current!.getBoundingClientRect();
        const pageX = iframeRect.left + e.clientX;
        const pageY = iframeRect.top + e.clientY;
        setPicker({ text, x: pageX, y: pageY });
      }
    }

    doc.addEventListener("mouseup", handleMouseUp);
    doc.addEventListener("mousedown", dismiss);
    return () => {
      doc.removeEventListener("mouseup", handleMouseUp);
      doc.removeEventListener("mousedown", dismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, rules.length, rules.map((r) => r.color + r.text).join("|"), dismiss]);

  const applyHighlight = useCallback(
    (hex: string) => {
      if (!picker) return;
      const exists = rules.find(
        (r) => r.text.toLowerCase() === picker.text.toLowerCase()
      );
      const next = exists
        ? rules.map((r) =>
            r.id === exists.id ? { ...r, color: hex } : r
          )
        : [
            ...rules,
            { id: crypto.randomUUID(), text: picker.text, color: hex },
          ];
      setHighlights(next);
      setPicker(null);
    },
    [picker, rules, setHighlights]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-100">
      <iframe
        ref={iframeRef}
        title="Highlight mode preview"
        sandbox="allow-same-origin allow-scripts"
        className="h-full w-full border-none"
        style={{ background: "white" }}
      />
      {picker && (
        <FloatingPicker
          x={picker.x}
          y={picker.y}
          onPick={applyHighlight}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
