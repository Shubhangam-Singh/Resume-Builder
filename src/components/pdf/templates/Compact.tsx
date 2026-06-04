import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDateRange, formatMonthYear } from "@/lib/resume/format";
import type { ResumeData } from "@/lib/resume/types";
import {
  contactItems,
  degreeLine,
  sectionPresence,
} from "./shared";

/**
 * Compact — single column tuned to fit more on a page: smaller type, tighter
 * spacing, condensed entry headers. Still ATS-safe (one column, real text).
 */

const TEXT = "#1a1a1a";
const MUTED = "#4a4a4a";
const RULE = "#999999";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TEXT,
    lineHeight: 1.28,
  },
  header: { marginBottom: 7, textAlign: "center" },
  name: { fontSize: 16, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  label: { fontSize: 9.5, color: MUTED, marginTop: 1 },
  contact: { fontSize: 8.5, color: MUTED, marginTop: 3 },
  contactSep: { color: RULE },
  link: { color: MUTED, textDecoration: "none" },

  section: { marginTop: 7 },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    paddingBottom: 1.5,
    marginBottom: 3.5,
  },
  summary: { fontSize: 9 },

  entry: { marginBottom: 5 },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  entrySubtitle: { fontSize: 9, color: MUTED },
  entryMeta: {
    fontSize: 8.5,
    color: MUTED,
    textAlign: "right",
    flexShrink: 0,
    marginLeft: 10,
  },
  entrySummary: { fontSize: 9, marginTop: 1 },

  bulletRow: { flexDirection: "row", marginTop: 1, paddingRight: 2 },
  bulletGlyph: { width: 9, fontSize: 9 },
  bulletText: { flex: 1, fontSize: 9 },

  skillRow: { flexDirection: "row", marginBottom: 1.5 },
  skillCategory: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  skillKeywords: { flex: 1, fontSize: 9 },
});

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Compact({ data }: { data: ResumeData }) {
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const items = contactItems(basics);

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
                  {i > 0 ? <Text style={styles.contactSep}>{"  |  "}</Text> : null}
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

        {has.summary ? (
          <View style={styles.section}>
            <SectionTitle>Summary</SectionTitle>
            <Text style={styles.summary}>{basics.summary}</Text>
          </View>
        ) : null}

        {has.work ? (
          <View style={styles.section}>
            <SectionTitle>Experience</SectionTitle>
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
        ) : null}

        {has.education ? (
          <View style={styles.section}>
            <SectionTitle>Education</SectionTitle>
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
          </View>
        ) : null}

        {has.skills ? (
          <View style={styles.section}>
            <SectionTitle>Skills</SectionTitle>
            {skills.map((s) => (
              <View key={s.id} style={styles.skillRow}>
                {s.name ? (
                  <Text style={styles.skillCategory}>{`${s.name}: `}</Text>
                ) : null}
                <Text style={styles.skillKeywords}>{s.keywords.join(", ")}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {has.projects ? (
          <View style={styles.section}>
            <SectionTitle>Projects</SectionTitle>
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
                  <Bullet key={i}>{h}</Bullet>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {has.certificates ? (
          <View style={styles.section}>
            <SectionTitle>Certifications</SectionTitle>
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
        ) : null}
      </Page>
    </Document>
  );
}
