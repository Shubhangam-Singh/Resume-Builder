import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDateRange, formatMonthYear } from "@/lib/resume/format";
import { resolveSectionOrder } from "@/lib/resume/sections";
import {
  makeScale,
  resolveAccent,
  resolveFont,
  type ResolvedFont,
  type Scale,
} from "@/lib/resume/theme";
import { ensureFontRegistered } from "@/lib/resume/fonts";
import type { HideableSection, ResumeData } from "@/lib/resume/types";
import {
  contactItems,
  degreeLine,
  sectionPresence,
} from "./shared";

const SIDEBAR_SECTIONS = new Set<HideableSection>([
  "skills",
  "education",
  "certificates",
]);

/**
 * Designer — two-column layout with a tinted sidebar. Best for human reviewers
 * and portfolios; the multi-column structure can reduce ATS compatibility.
 * Accent + density come from `meta` (default accent teal).
 */

const TEXT = "#1f2937";
const MUTED = "#5b6675";
const SIDEBAR_BG = "#f1f5f9";
const SIDEBAR_RULE = "#cbd5e1";
const SIDEBAR_WIDTH = "34%";
const DEFAULT_ACCENT = "#0e7490";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      fontFamily: font.regular,
      fontSize: sc.f(10),
      color: TEXT,
      lineHeight: sc.l(1.4),
    },
    sidebarBg: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: SIDEBAR_BG,
    },
    row: { flexDirection: "row" },

    sidebar: {
      width: SIDEBAR_WIDTH,
      paddingVertical: sc.s(34),
      paddingHorizontal: sc.s(18),
    },
    main: { flex: 1, paddingVertical: sc.s(34), paddingHorizontal: sc.s(24) },

    name: {
      fontSize: sc.f(22),
      fontFamily: font.bold,
      color: TEXT,
      lineHeight: sc.l(1.12),
    },
    label: {
      fontSize: sc.f(11.5),
      color: accent,
      marginTop: sc.s(2),
      marginBottom: sc.s(4),
    },

    mainTitle: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1,
      textTransform: "uppercase",
      borderBottomWidth: 1.5,
      borderBottomColor: accent,
      paddingBottom: sc.s(2),
      marginBottom: sc.s(6),
    },
    sideTitle: {
      fontSize: sc.f(10),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1,
      textTransform: "uppercase",
      borderBottomWidth: 1,
      borderBottomColor: SIDEBAR_RULE,
      paddingBottom: sc.s(2),
      marginBottom: sc.s(5),
    },

    mainSection: { marginTop: sc.s(13) },
    sideSection: { marginBottom: sc.s(14) },

    summary: { fontSize: sc.f(10) },

    sideItem: { marginBottom: sc.sp(7) },
    sideLine: { fontSize: sc.f(9), marginBottom: sc.s(2) },
    sideLink: {
      fontSize: sc.f(9),
      color: accent,
      textDecoration: "none",
      marginBottom: sc.s(2),
    },
    sideItemTitle: { fontSize: sc.f(9.5), fontFamily: font.bold },
    sideItemText: { fontSize: sc.f(9), color: MUTED },
    sideItemMeta: { fontSize: sc.f(8.5), color: MUTED },

    entry: { marginBottom: sc.sp(9) },
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryTitle: { fontSize: sc.f(10.5), fontFamily: font.bold },
    entrySubtitle: { fontSize: sc.f(10), color: MUTED },
    entryMeta: {
      fontSize: sc.f(9),
      color: MUTED,
      textAlign: "right",
      flexShrink: 0,
      marginLeft: sc.s(10),
    },
    entrySummary: { fontSize: sc.f(10), marginTop: sc.s(2) },

    bulletRow: { flexDirection: "row", marginTop: sc.sp(2), paddingRight: sc.s(4) },
    bulletGlyph: { width: sc.s(11), color: accent, fontSize: sc.f(10) },
    bulletText: { flex: 1, fontSize: sc.f(10) },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function Bullet({ styles, children }: { styles: Styles; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Designer({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const items = contactItems(basics);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const font = resolveFont(data.meta.fontFamily);
  const styles = makeStyles(accent, makeScale(data.meta), font);
  const order = resolveSectionOrder(data.meta);
  const sidebarOrder = order.filter((k) => SIDEBAR_SECTIONS.has(k));
  const mainOrder = order.filter((k) => !SIDEBAR_SECTIONS.has(k));

  const renderSection = (key: HideableSection): React.ReactNode => {
    switch (key) {
      case "skills":
        return has.skills ? (
          <View key="skills" style={styles.sideSection}>
            <Text style={styles.sideTitle}>Skills</Text>
            {skills.map((s) => (
              <View key={s.id} style={styles.sideItem}>
                {s.name ? (
                  <Text style={styles.sideItemTitle}>{s.name}</Text>
                ) : null}
                <Text style={styles.sideItemText}>{s.keywords.join(", ")}</Text>
              </View>
            ))}
          </View>
        ) : null;
      case "education":
        return has.education ? (
          <View key="education" style={styles.sideSection}>
            <Text style={styles.sideTitle}>Education</Text>
            {education.map((e) => (
              <View key={e.id} style={styles.sideItem}>
                <Text style={styles.sideItemTitle}>{e.institution}</Text>
                {degreeLine(e.studyType, e.area) ? (
                  <Text style={styles.sideItemText}>
                    {degreeLine(e.studyType, e.area)}
                  </Text>
                ) : null}
                {formatDateRange(e.startDate, e.endDate) || e.score ? (
                  <Text style={styles.sideItemMeta}>
                    {[formatDateRange(e.startDate, e.endDate), e.score]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null;
      case "certificates":
        return has.certificates ? (
          <View key="certificates" style={styles.sideSection}>
            <Text style={styles.sideTitle}>Certifications</Text>
            {certificates.map((c) => (
              <View key={c.id} style={styles.sideItem}>
                <Text style={styles.sideItemTitle}>{c.name}</Text>
                {[c.issuer, formatMonthYear(c.date)].filter(Boolean).length ? (
                  <Text style={styles.sideItemMeta}>
                    {[c.issuer, formatMonthYear(c.date)]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null;
      case "summary":
        return has.summary ? (
          <View key="summary" style={styles.mainSection}>
            <Text style={styles.mainTitle}>Summary</Text>
            <Text style={styles.summary}>{basics.summary}</Text>
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.mainSection}>
            <Text style={styles.mainTitle}>Experience</Text>
            {work.map((w) => (
              <View key={w.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={[styles.entryTitle, { flex: 1 }]}>
                    {w.position || w.name}
                    {w.position && w.name ? (
                      <Text style={styles.entrySubtitle}>{` — ${w.name}`}</Text>
                    ) : null}
                  </Text>
                  {formatDateRange(w.startDate, w.endDate) || w.location ? (
                    <Text style={styles.entryMeta}>
                      {[formatDateRange(w.startDate, w.endDate), w.location]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>
                  ) : null}
                </View>
                {w.summary ? (
                  <Text style={styles.entrySummary}>{w.summary}</Text>
                ) : null}
                {w.highlights.map((h, i) => (
                  <Bullet key={i} styles={styles}>
                    {h}
                  </Bullet>
                ))}
              </View>
            ))}
          </View>
        ) : null;
      case "projects":
        return has.projects ? (
          <View key="projects" style={styles.mainSection}>
            <Text style={styles.mainTitle}>Projects</Text>
            {projects.map((p) => (
              <View key={p.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={[styles.entryTitle, { flex: 1 }]}>
                    {p.url ? (
                      <Link style={styles.entrySubtitle} src={p.url}>
                        {p.name}
                      </Link>
                    ) : (
                      p.name
                    )}
                  </Text>
                  {p.keywords.length ? (
                    <Text style={styles.entryMeta}>{p.keywords.join(", ")}</Text>
                  ) : null}
                </View>
                {p.description ? (
                  <Text style={styles.entrySummary}>{p.description}</Text>
                ) : null}
                {p.highlights.map((h, i) => (
                  <Bullet key={i} styles={styles}>
                    {h}
                  </Bullet>
                ))}
              </View>
            ))}
          </View>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Document
      title={basics.name ? `${basics.name} — Resume` : "Resume"}
      author={basics.name || undefined}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.sidebarBg} fixed />

        <View style={styles.row}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            {items.length > 0 ? (
              <View style={styles.sideSection}>
                <Text style={styles.sideTitle}>Contact</Text>
                {items.map((it, i) =>
                  it.href ? (
                    <Link key={i} src={it.href} style={styles.sideLink}>
                      {it.text}
                    </Link>
                  ) : (
                    <Text key={i} style={styles.sideLine}>
                      {it.text}
                    </Text>
                  ),
                )}
              </View>
            ) : null}
            {sidebarOrder.map(renderSection)}
          </View>

          {/* Main column */}
          <View style={styles.main}>
            <Text style={styles.name}>{basics.name || "Your Name"}</Text>
            {basics.label ? (
              <Text style={styles.label}>{basics.label}</Text>
            ) : null}
            {mainOrder.map(renderSection)}
          </View>
        </View>
      </Page>
    </Document>
  );
}
