import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  formatDateRange,
  formatLocation,
  formatMonthYear,
} from "@/lib/resume/format";
import { resolveSectionOrder } from "@/lib/resume/sections";
import type { HideableSection, ResumeData } from "@/lib/resume/types";
import { sectionPresence } from "./shared";

/**
 * ATS Classic — single column, standard headings, real selectable text, no
 * tables or images. The safest possible layout for applicant tracking systems.
 *
 * This same component renders both the on-screen preview and the downloaded
 * file, so what you see is exactly what you get.
 */

const COLORS = {
  text: "#1a1a1a",
  muted: "#444444",
  rule: "#999999",
  link: "#1a1a1a",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 44,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // Header
  header: { marginBottom: 12, textAlign: "center" },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    lineHeight: 1.2,
    marginBottom: 3,
  },
  label: { fontSize: 11, color: COLORS.muted, marginTop: 1, lineHeight: 1.2 },
  contact: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: "center",
  },
  contactSep: { color: COLORS.rule },
  link: { color: COLORS.link, textDecoration: "none" },

  // Sections
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    paddingBottom: 2,
    marginBottom: 6,
  },

  summary: { fontSize: 10, color: COLORS.text },

  // Entries
  entry: { marginBottom: 8 },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  entrySubtitle: { fontSize: 10, color: COLORS.muted },
  entryMeta: {
    fontSize: 9.5,
    color: COLORS.muted,
    textAlign: "right",
    flexShrink: 0,
    marginLeft: 12,
  },
  entrySummary: { fontSize: 10, marginTop: 2 },

  // Bullets
  bulletRow: { flexDirection: "row", marginTop: 2, paddingRight: 4 },
  bulletGlyph: { width: 12, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },

  // Skills
  skillRow: { flexDirection: "row", marginBottom: 3 },
  skillCategory: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  skillKeywords: { flex: 1, fontSize: 10 },
});

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Join an array of nodes with a separator glyph (for the contact line). */
function joinNodes(nodes: React.ReactNode[]) {
  return nodes.map((node, i) => (
    <Text key={i}>
      {i > 0 ? <Text style={styles.contactSep}>{"  |  "}</Text> : null}
      {node}
    </Text>
  ));
}

export function AtsClassic({ data }: { data: ResumeData }) {
  const { basics, work, education, projects, skills, certificates } = data;
  const locationText = formatLocation(basics.location);
  const has = sectionPresence(data);

  const contactNodes: React.ReactNode[] = [];
  if (basics.email)
    contactNodes.push(
      <Link style={styles.link} src={`mailto:${basics.email}`}>
        {basics.email}
      </Link>,
    );
  if (basics.phone) contactNodes.push(<Text>{basics.phone}</Text>);
  if (locationText) contactNodes.push(<Text>{locationText}</Text>);
  if (basics.url)
    contactNodes.push(
      <Link style={styles.link} src={basics.url}>
        {basics.url.replace(/^https?:\/\//, "")}
      </Link>,
    );
  basics.profiles.forEach((p) => {
    const text = p.url || p.username || p.network;
    if (!text) return;
    contactNodes.push(
      p.url ? (
        <Link style={styles.link} src={p.url}>
          {`${p.network}: ${p.username || p.url.replace(/^https?:\/\//, "")}`}
        </Link>
      ) : (
        <Text>{`${p.network}: ${p.username}`}</Text>
      ),
    );
  });

  const renderSection = (key: HideableSection): React.ReactNode => {
    switch (key) {
      case "summary":
        return has.summary ? (
          <View key="summary" style={styles.section}>
            <SectionTitle>Summary</SectionTitle>
            <Text style={styles.summary}>{basics.summary}</Text>
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.section}>
            <SectionTitle>Experience</SectionTitle>
            {work.map((w) => {
              const dates = formatDateRange(w.startDate, w.endDate);
              return (
                <View key={w.id} style={styles.entry} wrap={false}>
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle}>
                        {w.position || w.name}
                        {w.position && w.name ? (
                          <Text style={styles.entrySubtitle}>{` — ${w.name}`}</Text>
                        ) : null}
                      </Text>
                    </View>
                    {dates || w.location ? (
                      <Text style={styles.entryMeta}>
                        {[dates, w.location].filter(Boolean).join("  ·  ")}
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
              );
            })}
          </View>
        ) : null;
      case "education":
        return has.education ? (
          <View key="education" style={styles.section}>
            <SectionTitle>Education</SectionTitle>
            {education.map((e) => {
              const dates = formatDateRange(e.startDate, e.endDate);
              const degree = [e.studyType, e.area].filter(Boolean).join(", ");
              return (
                <View key={e.id} style={styles.entry} wrap={false}>
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle}>{e.institution}</Text>
                      {degree ? (
                        <Text style={styles.entrySubtitle}>{degree}</Text>
                      ) : null}
                    </View>
                    {dates || e.score ? (
                      <Text style={styles.entryMeta}>
                        {[dates, e.score].filter(Boolean).join("  ·  ")}
                      </Text>
                    ) : null}
                  </View>
                  {e.courses.length ? (
                    <Text style={styles.entrySummary}>
                      {`Relevant coursework: ${e.courses.join(", ")}`}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null;
      case "projects":
        return has.projects ? (
          <View key="projects" style={styles.section}>
            <SectionTitle>Projects</SectionTitle>
            {projects.map((p) => (
              <View key={p.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle}>
                      {p.url ? (
                        <Link style={styles.link} src={p.url}>
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </Text>
                  </View>
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
      case "skills":
        return has.skills ? (
          <View key="skills" style={styles.section}>
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
        ) : null;
      case "certificates":
        return has.certificates ? (
          <View key="certificates" style={styles.section}>
            <SectionTitle>Certifications</SectionTitle>
            {certificates.map((c) => {
              const meta = [c.issuer, formatMonthYear(c.date)]
                .filter(Boolean)
                .join("  ·  ");
              return (
                <View key={c.id} style={styles.entry} wrap={false}>
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle}>{c.name}</Text>
                    </View>
                    {meta ? <Text style={styles.entryMeta}>{meta}</Text> : null}
                  </View>
                </View>
              );
            })}
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
          {contactNodes.length > 0 ? (
            <Text style={styles.contact}>{joinNodes(contactNodes)}</Text>
          ) : null}
        </View>

        {resolveSectionOrder(data.meta).map(renderSection)}
      </Page>
    </Document>
  );
}
