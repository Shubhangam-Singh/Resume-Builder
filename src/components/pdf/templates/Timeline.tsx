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
import { makeScale, resolveAccent, resolveFont, type ResolvedFont, type Scale } from "@/lib/resume/theme";
import { ensureFontRegistered } from "@/lib/resume/fonts";
import type { HideableSection, ResumeData } from "@/lib/resume/types";
import { contactItems, degreeLine, sectionPresence } from "./shared";

/**
 * Timeline — single column where dated sections (experience, education,
 * projects) run down a vertical rail with accent dots. Real, single-column
 * text, so it stays reasonably ATS-friendly while looking modern.
 */

const TEXT = "#1a1a1a";
const MUTED = "#555555";
const RAIL = "#d1d5db";
const DEFAULT_ACCENT = "#4f46e5";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      paddingTop: sc.s(40),
      paddingBottom: sc.s(44),
      paddingHorizontal: sc.s(46),
      fontFamily: font.regular,
      fontSize: sc.f(10),
      color: TEXT,
      lineHeight: sc.l(1.4),
    },
    header: { marginBottom: sc.s(14) },
    name: { fontSize: sc.f(22), fontFamily: font.bold, lineHeight: sc.l(1.15) },
    label: { fontSize: sc.f(11), color: accent, marginTop: sc.s(2) },
    contact: { fontSize: sc.f(9), color: MUTED, marginTop: sc.s(6) },
    contactSep: { color: "#bbbbbb" },
    link: { color: MUTED, textDecoration: "none" },

    section: { marginTop: sc.s(13) },
    sectionTitle: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1,
      textTransform: "uppercase",
      borderBottomWidth: 1,
      borderBottomColor: RAIL,
      paddingBottom: sc.s(2),
      marginBottom: sc.s(8),
    },
    summary: { fontSize: sc.f(10) },

    // Timeline rail
    tlRow: { flexDirection: "row" },
    rail: { width: sc.s(16), alignItems: "center" },
    railLine: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: sc.s(7),
      width: 1.5,
      backgroundColor: RAIL,
    },
    dot: {
      width: sc.s(8),
      height: sc.s(8),
      borderRadius: sc.s(4),
      backgroundColor: accent,
      marginTop: sc.s(3),
    },
    tlContent: { flex: 1, paddingBottom: sc.sp(9), paddingLeft: sc.s(4) },

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

    entry: { marginBottom: sc.sp(8) },
    skillRow: { flexDirection: "row", marginBottom: sc.sp(3) },
    skillCategory: { fontFamily: font.bold, fontSize: sc.f(10) },
    skillKeywords: { flex: 1, fontSize: sc.f(10) },
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

function TimelineItem({ styles, children }: { styles: Styles; children: React.ReactNode }) {
  return (
    <View style={styles.tlRow} wrap={false}>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        <View style={styles.dot} />
      </View>
      <View style={styles.tlContent}>{children}</View>
    </View>
  );
}

export function Timeline({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const items = contactItems(basics);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const font = resolveFont(data.meta.fontFamily);
  const styles = makeStyles(accent, makeScale(data.meta), font);

  const renderSection = (key: HideableSection): React.ReactNode => {
    switch (key) {
      case "summary":
        return has.summary ? (
          <View key="summary" style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{basics.summary}</Text>
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {work.map((w) => (
              <TimelineItem key={w.id} styles={styles}>
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
              </TimelineItem>
            ))}
          </View>
        ) : null;
      case "education":
        return has.education ? (
          <View key="education" style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((e) => (
              <TimelineItem key={e.id} styles={styles}>
                <View style={styles.entryHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle}>{e.institution}</Text>
                    {degreeLine(e.studyType, e.area) ? (
                      <Text style={styles.entrySubtitle}>
                        {degreeLine(e.studyType, e.area)}
                      </Text>
                    ) : null}
                  </View>
                  {formatDateRange(e.startDate, e.endDate) || e.score ? (
                    <Text style={styles.entryMeta}>
                      {[formatDateRange(e.startDate, e.endDate), e.score]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>
                  ) : null}
                </View>
              </TimelineItem>
            ))}
          </View>
        ) : null;
      case "projects":
        return has.projects ? (
          <View key="projects" style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((p) => (
              <TimelineItem key={p.id} styles={styles}>
                <View style={styles.entryHeaderRow}>
                  <Text style={[styles.entryTitle, { flex: 1 }]}>
                    {p.url ? (
                      <Link style={styles.link} src={p.url}>
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
              </TimelineItem>
            ))}
          </View>
        ) : null;
      case "skills":
        return has.skills ? (
          <View key="skills" style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {skills.map((s) => (
              <View key={s.id} style={styles.skillRow}>
                {s.name ? (
                  <Text style={styles.skillCategory}>{`${s.name}: `}</Text>
                ) : null}
                <Text style={styles.skillKeywords}>{s.keywords.join(", ")}</Text>
              </View>
            ))}
          </View>
        ) : null;
      case "certificates":
        return has.certificates ? (
          <View key="certificates" style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certificates.map((c) => (
              <View key={c.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={[styles.entryTitle, { flex: 1 }]}>{c.name}</Text>
                  {[c.issuer, formatMonthYear(c.date)].filter(Boolean).length ? (
                    <Text style={styles.entryMeta}>
                      {[c.issuer, formatMonthYear(c.date)]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>
                  ) : null}
                </View>
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
        <View style={styles.header}>
          <Text style={styles.name}>{basics.name || "Your Name"}</Text>
          {basics.label ? <Text style={styles.label}>{basics.label}</Text> : null}
          {items.length > 0 ? (
            <Text style={styles.contact}>
              {items.map((it, i) => (
                <Text key={i}>
                  {i > 0 ? <Text style={styles.contactSep}>{"  ·  "}</Text> : null}
                  {it.href ? (
                    <Link style={styles.link} src={it.href}>
                      {it.text}
                    </Link>
                  ) : (
                    it.text
                  )}
                </Text>
              ))}
            </Text>
          ) : null}
        </View>

        {resolveSectionOrder(data.meta).map(renderSection)}
      </Page>
    </Document>
  );
}
