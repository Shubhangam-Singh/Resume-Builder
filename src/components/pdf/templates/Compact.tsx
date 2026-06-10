import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  formatDateRange as fmtRange,
  formatMonthYear as fmtMonth,
} from "@/lib/resume/format";
import { customIdFromKey, resolveSectionOrder } from "@/lib/resume/sections";
import {
  makeScale,
  resolveAccent,
  resolveFont,
  type ResolvedFont,
  type Scale,
} from "@/lib/resume/theme";
import { ensureFontRegistered } from "@/lib/resume/fonts";
import type { ResumeData, SectionKey } from "@/lib/resume/types";
import { CustomSectionView } from "./CustomSection";
import {
  agencyContactLine,
  contactItems,
  degreeLine,
  sectionPresence,
} from "./shared";

/**
 * Compact — single column tuned to fit more on a page. Accent + density come
 * from `meta`; the default accent is a neutral charcoal so it stays plain.
 */

const TEXT = "#1a1a1a";
const MUTED = "#4a4a4a";
const RULE = "#bbbbbb";
const DEFAULT_ACCENT = "#1f2937";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      paddingTop: sc.s(28),
      paddingBottom: sc.s(30),
      paddingHorizontal: sc.s(38),
      fontFamily: font.regular,
      fontSize: sc.f(9),
      color: TEXT,
      lineHeight: sc.l(1.28),
    },
    header: { marginBottom: sc.s(7), textAlign: "center" },
    name: { fontSize: sc.f(16), fontFamily: font.bold, lineHeight: sc.l(1.1) },
    label: { fontSize: sc.f(9.5), color: MUTED, marginTop: sc.s(1) },
    contact: { fontSize: sc.f(8.5), color: MUTED, marginTop: sc.s(3) },
    contactSep: { color: RULE },
    link: { color: accent, textDecoration: "none" },

    section: { marginTop: sc.s(7) },
    sectionTitle: {
      fontSize: sc.f(9.5),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      borderBottomWidth: 0.75,
      borderBottomColor: accent,
      paddingBottom: sc.s(1.5),
      marginBottom: sc.s(3.5),
    },
    summary: { fontSize: sc.f(9) },

    entry: { marginBottom: sc.sp(5) },
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryTitle: { fontSize: sc.f(9.5), fontFamily: font.bold },
    entrySubtitle: { fontSize: sc.f(9), color: MUTED },
    entryMeta: {
      fontSize: sc.f(8.5),
      color: MUTED,
      textAlign: "right",
      flexShrink: 0,
      marginLeft: sc.s(10),
    },
    entrySummary: { fontSize: sc.f(9), marginTop: sc.s(1) },

    bulletRow: { flexDirection: "row", marginTop: sc.sp(1), paddingRight: sc.s(2) },
    bulletGlyph: { width: sc.s(9), color: accent, fontSize: sc.f(9) },
    bulletText: { flex: 1, fontSize: sc.f(9) },

    skillRow: { flexDirection: "row", marginBottom: sc.s(1.5) },
    skillCategory: { fontFamily: font.bold, fontSize: sc.f(9) },
    skillKeywords: { flex: 1, fontSize: sc.f(9) },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function SectionTitle({ styles, children }: { styles: Styles; children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Bullet({ styles, children }: { styles: Styles; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Compact({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const agencyBranding = data.meta.agencyBranding;
  const agencyContact = agencyContactLine(agencyBranding);
  const items = contactItems(basics, agencyBranding);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const font = resolveFont(data.meta.fontFamily);
  const sc = makeScale(data.meta);
  const styles = makeStyles(accent, sc, font);
  const dateFormat = data.meta.dateFormat;
  const formatDateRange = (s: string, e: string) => fmtRange(s, e, dateFormat);
  const formatMonthYear = (v: string) => fmtMonth(v, dateFormat);

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return has.summary ? (
          <View key="summary" style={styles.section}>
            <SectionTitle styles={styles}>Summary</SectionTitle>
            <Text style={styles.summary}>{basics.summary}</Text>
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.section}>
            <SectionTitle styles={styles}>Experience</SectionTitle>
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
      case "education":
        return has.education ? (
          <View key="education" style={styles.section}>
            <SectionTitle styles={styles}>Education</SectionTitle>
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
        ) : null;
      case "projects":
        return has.projects ? (
          <View key="projects" style={styles.section}>
            <SectionTitle styles={styles}>Projects</SectionTitle>
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
          </View>
        ) : null;
      case "skills":
        return has.skills ? (
          <View key="skills" style={styles.section}>
            <SectionTitle styles={styles}>Skills</SectionTitle>
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
            <SectionTitle styles={styles}>Certifications</SectionTitle>
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
      default: {
        const id = customIdFromKey(key);
        const cs = id
          ? (data.customSections ?? []).find((s) => s.id === id)
          : null;
        return cs ? (
          <CustomSectionView
            key={key}
            section={cs}
            accent={accent}
            sc={sc}
            font={font}
            dateFormat={dateFormat}
          />
        ) : null;
      }
    }
  };

  return (
    <Document
      title={basics.name ? `${basics.name} — Resume` : "Resume"}
      author={basics.name || undefined}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={agencyBranding?.logoBase64 ? [styles.header, { paddingRight: sc.s(90) }] : styles.header}>
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
          {agencyContact ? (
            <Text style={[styles.contact, { marginTop: sc.s(3), fontSize: sc.f(8) }]}>{agencyContact}</Text>
          ) : null}
          {agencyBranding?.logoBase64 && (
            <Image src={agencyBranding.logoBase64} style={{ position: "absolute", top: 0, right: 0, width: sc.s(80), height: sc.s(50), objectFit: "contain", objectPositionX: "right" }} />
          )}
        </View>

        {resolveSectionOrder(data.meta, data.customSections ?? []).map(renderSection)}
      </Page>
    </Document>
  );
}
