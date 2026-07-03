"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Crosshair,
  Download,
  FileText,
  FileType,
  History,
  LayoutTemplate,
  Link2,
  Moon,
  Palette,
  Printer,
  Redo2,
  Ruler,
  Search,
  Share2,
  ShieldCheck,
  SquarePen,
  Sun,
  Undo2,
  Wand2,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TEMPLATES } from "@/components/pdf/templates/meta";
import { downloadResumeText } from "@/lib/export/text";
import { downloadResumeJson } from "@/lib/persist/json";
import { THEME_PRESETS } from "@/lib/resume/theme";
import { useAgencyStore } from "@/lib/agency-store";
import { useResumeStore, selectCanRedo, selectCanUndo } from "@/lib/store";
import { useUiStore, type EditorTab } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void | Promise<void>;
}

const EDITOR_TABS: { value: EditorTab; label: string }[] = [
  { value: "basics", label: "Basics" },
  { value: "work", label: "Experience" },
  { value: "education", label: "Education" },
  { value: "skills", label: "Skills" },
  { value: "projects", label: "Projects" },
  { value: "certificates", label: "Certifications" },
  { value: "custom", label: "Custom sections" },
];

function toggleDarkMode(): void {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem("resumeforge-theme", next ? "dark" : "light");
  } catch {
    // ignore storage failures
  }
}

/** Every query token must appear in the haystack; rank prefix matches first. */
function scoreAction(action: Action, tokens: string[]): number {
  const hay = `${action.group} ${action.label}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    const idx = hay.indexOf(t);
    if (idx === -1) return -1;
    score += idx === 0 || hay[idx - 1] === " " ? 0 : 5; // word-start beats mid-word
    score += idx; // earlier matches rank higher
  }
  return score;
}

/**
 * Ctrl+K command palette: every editor section, template, theme, export, and
 * tool, reachable in two keystrokes. Renders nothing until opened.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const resume = useResumeStore((s) => s.resume);
  const agencyBranding = useAgencyStore((s) => s.branding);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const setThemePreset = useResumeStore((s) => s.setThemePreset);
  const setThemeColor = useResumeStore((s) => s.setThemeColor);
  const setPageSize = useResumeStore((s) => s.setPageSize);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const canUndo = useResumeStore(selectCanUndo);
  const canRedo = useResumeStore(selectCanRedo);
  const setEditorTab = useUiStore((s) => s.setEditorTab);
  const openDialog = useUiStore((s) => s.openDialog);

  // Open on request (the toolbar search button dispatches "palette").
  const dialogRequest = useUiStore((s) => s.dialog);
  const closeDialogRequest = useUiStore((s) => s.closeDialog);
  useEffect(() => {
    if (dialogRequest === "palette") {
      setOpen(true);
      closeDialogRequest();
    }
  }, [dialogRequest, closeDialogRequest]);

  // Global shortcut: Ctrl/Cmd+K toggles the palette.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    // Closed (and during SSR prerender) the palette needs no actions — this
    // also keeps `document` access below out of the server render.
    if (!open) return [];
    const close = () => setOpen(false);
    const list: Action[] = [];

    for (const t of EDITOR_TABS) {
      list.push({
        id: `tab-${t.value}`,
        group: "Go to",
        label: t.label,
        icon: <SquarePen className="h-4 w-4" />,
        run: () => {
          setEditorTab(t.value);
          close();
        },
      });
    }

    list.push(
      {
        id: "download-pdf",
        group: "Export",
        label: "Download PDF",
        icon: <Download className="h-4 w-4" />,
        run: async () => {
          close();
          const { downloadResumePdf } = await import("@/lib/export/pdf");
          await downloadResumePdf({
            ...resume,
            meta: { ...resume.meta, agencyBranding },
          });
        },
      },
      {
        id: "export-docx",
        group: "Export",
        label: "Export as Word (.docx)",
        icon: <FileType className="h-4 w-4" />,
        run: async () => {
          close();
          const m = await import("@/lib/export/docx");
          await m.downloadResumeDocx(resume);
        },
      },
      {
        id: "export-txt",
        group: "Export",
        label: "Export as plain text",
        icon: <FileText className="h-4 w-4" />,
        run: () => {
          close();
          downloadResumeText(resume);
        },
      },
      {
        id: "export-json",
        group: "Export",
        label: "Export as JSON",
        icon: <Download className="h-4 w-4" />,
        run: () => {
          close();
          downloadResumeJson(resume);
        },
      },
      {
        id: "print",
        group: "Export",
        label: "Print",
        icon: <Printer className="h-4 w-4" />,
        run: async () => {
          close();
          const m = await import("@/lib/export/print");
          await m.printResume(resume);
        },
      },
      {
        id: "share",
        group: "Export",
        label: "Share as link",
        icon: <Share2 className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("share");
        },
      },
    );

    for (const t of TEMPLATES) {
      list.push({
        id: `template-${t.id}`,
        group: "Template",
        label: t.name,
        hint: t.atsSafe ? "ATS-safe" : undefined,
        icon: <LayoutTemplate className="h-4 w-4" />,
        run: () => {
          setTemplate(t.id);
          close();
        },
      });
    }

    for (const p of THEME_PRESETS) {
      list.push({
        id: `theme-${p.id}`,
        group: "Theme",
        label: p.label,
        icon: (
          <span className="flex h-4 w-4 overflow-hidden rounded-full">
            <span className="flex-1" style={{ background: p.accent }} />
            <span className="flex-1" style={{ background: p.secondary }} />
          </span>
        ),
        run: () => {
          setThemePreset(p.accent, p.secondary);
          close();
        },
      });
    }
    list.push({
      id: "theme-default",
      group: "Theme",
      label: "Template default colors",
      icon: <Palette className="h-4 w-4" />,
      run: () => {
        setThemeColor(undefined);
        close();
      },
    });

    list.push(
      {
        id: "page-letter",
        group: "Design",
        label: "Paper size: US Letter",
        icon: <Ruler className="h-4 w-4" />,
        run: () => {
          setPageSize("LETTER");
          close();
        },
      },
      {
        id: "page-a4",
        group: "Design",
        label: "Paper size: A4",
        icon: <Ruler className="h-4 w-4" />,
        run: () => {
          setPageSize("A4");
          close();
        },
      },
      {
        id: "dark-mode",
        group: "Design",
        label: "Toggle dark mode",
        icon: document.documentElement.classList.contains("dark") ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        ),
        run: () => {
          toggleDarkMode();
          close();
        },
      },
    );

    list.push(
      {
        id: "tailor",
        group: "Tools",
        label: "Tailor for a job",
        hint: "keywords + AI",
        icon: <Crosshair className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("tailor");
        },
      },
      {
        id: "ats-check",
        group: "Tools",
        label: "ATS check",
        icon: <ShieldCheck className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("ats-check");
        },
      },
      {
        id: "cover-letter",
        group: "Tools",
        label: "Cover letter",
        icon: <FileText className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("cover-letter");
        },
      },
      {
        id: "version-history",
        group: "Tools",
        label: "Version history",
        icon: <History className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("version-history");
        },
      },
      {
        id: "apply-tracker",
        group: "Tools",
        label: "Application tracker",
        icon: <Briefcase className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("apply-tracker");
        },
      },
      {
        id: "ai-settings",
        group: "Tools",
        label: "AI bullet helper",
        icon: <Wand2 className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("ai-settings");
        },
      },
      {
        id: "linkedin-import",
        group: "Tools",
        label: "Import from LinkedIn",
        icon: <Link2 className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("linkedin-import");
        },
      },
      {
        id: "wizard",
        group: "Tools",
        label: "Resume wizard (guided)",
        icon: <Wand2 className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("wizard");
        },
      },
      {
        id: "role-samples",
        group: "Tools",
        label: "Start from a role template",
        icon: <LayoutTemplate className="h-4 w-4" />,
        run: () => {
          close();
          openDialog("role-samples");
        },
      },
    );

    if (canUndo) {
      list.push({
        id: "undo",
        group: "Edit",
        label: "Undo",
        hint: "Ctrl+Z",
        icon: <Undo2 className="h-4 w-4" />,
        run: () => {
          undo();
          close();
        },
      });
    }
    if (canRedo) {
      list.push({
        id: "redo",
        group: "Edit",
        label: "Redo",
        hint: "Ctrl+Shift+Z",
        icon: <Redo2 className="h-4 w-4" />,
        run: () => {
          redo();
          close();
        },
      });
    }

    return list;
  }, [
    open,
    resume,
    agencyBranding,
    canUndo,
    canRedo,
    setEditorTab,
    openDialog,
    setTemplate,
    setThemePreset,
    setThemeColor,
    setPageSize,
    undo,
    redo,
  ]);

  const filtered = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return actions;
    return actions
      .map((a) => ({ a, s: scoreAction(a, tokens) }))
      .filter((x) => x.s >= 0)
      .sort((x, y) => x.s - y.s)
      .map((x) => x.a);
  }, [actions, query]);

  // Keep the active row valid and visible as the list filters down.
  useEffect(() => {
    setActive(0);
  }, [query]);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = filtered[active];
      if (action) void action.run();
    }
  }

  let lastGroup = "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Type a command… (templates, themes, export, tools)"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching commands.
            </p>
          )}
          {filtered.map((a, i) => {
            const showGroup = a.group !== lastGroup;
            lastGroup = a.group;
            return (
              <div key={a.id}>
                {showGroup && (
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {a.group}
                  </p>
                )}
                <button
                  type="button"
                  data-index={i}
                  onClick={() => void a.run()}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                    i === active ? "bg-accent" : "",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">{a.icon}</span>
                  <span className="flex-1 truncate">{a.label}</span>
                  {a.hint && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {a.hint}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
