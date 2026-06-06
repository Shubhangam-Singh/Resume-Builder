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
 * Zenith — editorial layout: each section's heading sits in a slim left margin,
 * with the content in a wider right column divided by a hairline rule. Refined
 * and distinctive; two-column, so it's flagged as potentially ATS-risky.
 */

const TEXT = "#1f2937";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const DEFAULT_ACCENT = "#0f766e";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      paddingTop: sc.s(42),
      paddingBottom: sc.s(46),
      paddingHorizontal: sc.s(48),
      fontFamily: font.regular,
      fontSize: sc.f(10),
      color: TEXT,
      lineHeight: sc.l(1.45),
    },
    header: { marginBottom: sc.s(18) },
    name: { fontSize: sc.f(24), fontFamily: font.bold, letterSpacing: 0.5 },
    label: { fontSize: sc.f(11.5), color: accent, marginTop: sc.s(2) },
    contact: { fontSize: sc.f(9), color: MUTED, marginTop: sc.s(6) },
    contactSep: { color: "#cbd5e1" },
    link: { color: MUTED, textDecoration: "none" },

    row: { flexDirection: "row", marginBottom: sc.s(16) },
    labelCol: { width: sc.s(96), paddingRight: sc.s(12), paddingTop: sc.s(1) },
    sectionLabel: {
      fontSize: sc.f(9),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      textAlign: "right",
    },
    contentCol: {
      flex: 1,
      borderLeftWidth: 1,
      borderLeftColor: RULE,
      paddingLeft: sc.s(16),
    },
    summary: { fontSize: sc.f(10) },

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

export function Zenith({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const items = contactItems(basics);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const font = resolveFont(data.meta.fontFamily);
  const styles = makeStyles(accent, makeScale(data.meta), font);

  const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={styles.labelCol}>
        <Text style={styles.sectionLabel}>{title}</Text>
      </View>
      <View style={styles.contentCol}>{children}</View>
    </View>
  );

  const renderSection = (key: HideableSection): React.ReactNode => {
    switch (key) {
      case "summary":
        return has.summary ? (
          <Row key="summary" title="Summary">
            <Text style={styles.summary}>{basics.summary}</Text>
          </Row>
        ) : null;
      case "work":
        return has.work ? (
          <Row key="work" title="Experience">
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
          </Row>
        ) : null;
      case "education":
        return has.education ? (
          <Row key="education" title="Education">
            {education.map((e) => (
              <View key={e.id} style={styles.entry} wrap={false}>
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
              </View>
            ))}
          </Row>
        ) : null;
      case "projects":
        return has.projects ? (
          <Row key="projects" title="Projects">
            {projects.map((p) => (
              <View key={p.id} style={styles.entry} wrap={false}>
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
              </View>
            ))}
          </Row>
        ) : null;
      case "skills":
        return has.skills ? (
          <Row key="skills" title="Skills">
            {skills.map((s) => (
              <View key={s.id} style={styles.skillRow}>
                {s.name ? (
                  <Text style={styles.skillCategory}>{`${s.name}: `}</Text>
                ) : null}
                <Text style={styles.skillKeywords}>{s.keywords.join(", ")}</Text>
              </View>
            ))}
          </Row>
        ) : null;
      case "certificates":
        return has.certificates ? (
          <Row key="certificates" title="Certifications">
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
          </Row>
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
