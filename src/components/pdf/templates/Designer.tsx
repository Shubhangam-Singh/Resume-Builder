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
 * and portfolios; the multi-column structure can reduce ATS compatibility, so
 * it is clearly flagged as such in the template picker.
 */

const ACCENT = "#0e7490";
const TEXT = "#1f2937";
const MUTED = "#5b6675";
const SIDEBAR_BG = "#f1f5f9";
const SIDEBAR_WIDTH = "34%";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: TEXT,
    lineHeight: 1.4,
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
    paddingVertical: 34,
    paddingHorizontal: 18,
  },
  main: { flex: 1, paddingVertical: 34, paddingHorizontal: 24 },

  // Main header
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    lineHeight: 1.12,
  },
  label: { fontSize: 11.5, color: ACCENT, marginTop: 2, marginBottom: 4 },

  // Section titles
  mainTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1,
    textTransform: "uppercase",
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    paddingBottom: 2,
    marginBottom: 6,
  },
  sideTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
    marginBottom: 5,
  },

  mainSection: { marginTop: 13 },
  sideSection: { marginBottom: 14 },

  summary: { fontSize: 10 },

  // Sidebar items
  sideItem: { marginBottom: 7 },
  sideLine: { fontSize: 9, marginBottom: 2 },
  sideLink: { fontSize: 9, color: TEXT, textDecoration: "none", marginBottom: 2 },
  sideItemTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  sideItemText: { fontSize: 9, color: MUTED },
  sideItemMeta: { fontSize: 8.5, color: MUTED },

  // Main entries
  entry: { marginBottom: 9 },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  entrySubtitle: { fontSize: 10, color: MUTED },
  entryMeta: {
    fontSize: 9,
    color: MUTED,
    textAlign: "right",
    flexShrink: 0,
    marginLeft: 10,
  },
  entrySummary: { fontSize: 10, marginTop: 2 },

  bulletRow: { flexDirection: "row", marginTop: 2, paddingRight: 4 },
  bulletGlyph: { width: 11, color: ACCENT, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
});

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Designer({ data }: { data: ResumeData }) {
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const items = contactItems(basics);
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
                  <Bullet key={i}>{h}</Bullet>
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
                  <Bullet key={i}>{h}</Bullet>
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
      title={basics.name ? `${basics.name} — Résumé` : "Résumé"}
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
