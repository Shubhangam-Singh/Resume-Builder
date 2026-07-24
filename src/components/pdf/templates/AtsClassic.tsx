import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { HighlightText } from "../HighlightText";

import {
  formatDateRange as fmtRange,
  formatLocation,
  formatMonthYear as fmtMonth,
} from "@/lib/resume/format";
import { customIdFromKey, resolveSectionOrder } from "@/lib/resume/sections";
import {
  makeScale,
  resolveAccent,
  resolveSecondary,
  resolveBulletGlyph,
  resolveFont,
  type ResolvedFont,
  type Scale,
} from "@/lib/resume/theme";
import { ensureFontRegistered } from "@/lib/resume/fonts";
import type { HighlightRule, ResumeData, SectionKey } from "@/lib/resume/types";
import { CustomSectionView } from "./CustomSection";
import { agencyContactLine, sectionPresence } from "./shared";

/**
 * ATS Classic — single column, standard headings, real selectable text, no
 * tables or images. The safest possible layout for applicant tracking systems.
 * Accent + density come from `meta`; the default accent is a neutral charcoal.
 *
 * This same component renders both the on-screen preview and the downloaded
 * file, so what you see is exactly what you get.
 */

const TEXT = "#1a1a1a";
const MUTED = "#444444";
const RULE = "#999999";
const DEFAULT_ACCENT = "#1f2937";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      paddingTop: sc.s(40),
      paddingBottom: sc.s(44),
      paddingHorizontal: sc.s(48),
      fontFamily: font.regular,
      fontSize: sc.f(10),
      color: TEXT,
      lineHeight: sc.l(1.4),
    },

    header: { marginBottom: sc.s(12), textAlign: "center" },
    name: {
      fontSize: sc.f(20),
      fontFamily: font.bold,
      letterSpacing: 0.5,
      lineHeight: sc.l(1.2),
      marginBottom: sc.s(3),
    },
    label: {
      fontSize: sc.f(11),
      color: MUTED,
      marginTop: sc.s(1),
      lineHeight: sc.l(1.2),
    },
    contact: {
      fontSize: sc.f(9),
      color: MUTED,
      marginTop: sc.s(6),
      textAlign: "center",
    },
    contactSep: { color: RULE },
    link: { color: accent, textDecoration: "none" },

    section: { marginTop: sc.s(12) },
    sectionTitle: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1,
      textTransform: "uppercase",
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: sc.s(2),
      marginBottom: sc.s(6),
    },

    summary: { fontSize: sc.f(10), color: TEXT },

    entry: { marginBottom: sc.sp(8) },
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryTitle: { fontSize: sc.f(10.5), fontFamily: font.bold },
    entrySubtitle: { fontSize: sc.f(10), color: MUTED },
    entryMeta: {
      fontSize: sc.f(9.5),
      color: MUTED,
      textAlign: "right",
      flexShrink: 0,
      marginLeft: sc.s(12),
    },
    entrySummary: { fontSize: sc.f(10), marginTop: sc.s(2) },

    bulletRow: { flexDirection: "row", marginTop: sc.sp(2), paddingRight: sc.s(4) },
    bulletGlyph: { width: sc.s(12), fontSize: sc.f(10), color: accent },
    bulletText: { flex: 1, fontSize: sc.f(10) },

    skillRow: { flexDirection: "row", marginBottom: sc.s(3) },
    skillCategory: { fontFamily: font.bold, fontSize: sc.f(10) },
    skillKeywords: { flex: 1, fontSize: sc.f(10) },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function Bullet({ styles, glyph, highlights, children }: { styles: Styles; glyph: string; highlights?: HighlightRule[]; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>{glyph}</Text>
      <HighlightText text={children} highlights={highlights} style={styles.bulletText} />
    </View>
  );
}

function SectionTitle({ styles, children }: { styles: Styles; children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Join an array of nodes with a separator glyph (for the contact line). */
function joinNodes(nodes: React.ReactNode[], styles: Styles) {
  return nodes.map((node, i) => (
    <Text key={i}>
      {i > 0 ? <Text style={styles.contactSep}>{"  |  "}</Text> : null}
      {node}
    </Text>
  ));
}

export function AtsClassic({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const locationText = formatLocation(basics.location);
  const has = sectionPresence(data);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const secondary = resolveSecondary(data.meta.secondaryColor);
  const bulletGlyph = resolveBulletGlyph(data.meta.bulletStyle);
  const font = resolveFont(data.meta.fontFamily);
  const sc = makeScale(data.meta);
  const styles = makeStyles(accent, sc, font);
  const dateFormat = data.meta.dateFormat;
  const formatDateRange = (s: string, e: string) => fmtRange(s, e, dateFormat);
  const formatMonthYear = (v: string) => fmtMonth(v, dateFormat);

  const contactNodes: React.ReactNode[] = [];
  const agencyBranding = data.meta.agencyBranding;
  const agencyContact = agencyContactLine(agencyBranding);

  if (!agencyBranding?.enabled) {
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
      const displayText = p.url
        ? (p.username || p.url.replace(/^https?:\/\//, ""))
        : (p.username || p.network);
      if (!displayText) return;
      contactNodes.push(
        p.url ? (
          <Link style={styles.link} src={p.url}>
            {displayText}
          </Link>
        ) : (
          <Text>{displayText}</Text>
        ),
      );
    });
  }

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return has.summary ? (
          <View key="summary" style={styles.section}>
            <SectionTitle styles={styles}>Summary</SectionTitle>
            <HighlightText text={basics.summary} highlights={data.meta.highlights} style={styles.summary} />
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.section}>
            <SectionTitle styles={styles}>Experience</SectionTitle>
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
                    <HighlightText text={w.summary} highlights={data.meta.highlights} style={styles.entrySummary} />
                  ) : null}
                  {w.highlights.map((h, i) => (
                    <Bullet key={i} styles={styles} glyph={bulletGlyph} highlights={data.meta.highlights}>
                      {h}
                    </Bullet>
                  ))}
                </View>
              );
            })}
          </View>
        ) : null;
      case "education":
        return has.education ? (
          <View key="education" style={styles.section}>
            <SectionTitle styles={styles}>Education</SectionTitle>
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
            <SectionTitle styles={styles}>Projects</SectionTitle>
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
                  <HighlightText text={p.description} highlights={data.meta.highlights} style={styles.entrySummary} />
                ) : null}
                {p.highlights.map((h, i) => (
                  <Bullet key={i} styles={styles} glyph={bulletGlyph} highlights={data.meta.highlights}>
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
                <Text style={styles.skillKeywords}>{s.keywords.join(", ")}{s.level ? ` · ${s.level}` : ""}</Text>
              </View>
            ))}
          </View>
        ) : null;
      case "certificates":
        return has.certificates ? (
          <View key="certificates" style={styles.section}>
            <SectionTitle styles={styles}>Certifications</SectionTitle>
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
      default: {
        const id = customIdFromKey(key);
        const cs = id
          ? (data.customSections ?? []).find((s) => s.id === id)
          : null;
        return cs ? (
          <CustomSectionView highlights={data.meta.highlights} bullet={bulletGlyph}
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
      <Page size={data.meta.pageSize ?? "LETTER"} style={styles.page}>
        <View style={agencyBranding?.logoBase64 ? [styles.header, { paddingLeft: sc.s(90), paddingRight: sc.s(90) }] : styles.header}>
          <Text style={styles.name}>{basics.name || "Your Name"}</Text>
          {basics.label ? <Text style={secondary ? [styles.label, { color: secondary }] : styles.label}>{basics.label}</Text> : null}
          {contactNodes.length > 0 ? (
            <Text style={styles.contact}>{joinNodes(contactNodes, styles)}</Text>
          ) : null}
          {agencyContact ? (
            <Text style={[styles.contact, { marginTop: sc.s(4), fontSize: sc.f(9) }]}>{agencyContact}</Text>
          ) : null}
          {agencyBranding?.logoBase64 && (
            <Image src={agencyBranding.logoBase64} style={{ position: "absolute", top: 0, right: 0, width: sc.s(80), height: sc.s(50), objectFit: "contain", objectPositionX: "right" }} />
          )}
        </View>

        {resolveSectionOrder(data.meta, data.customSections ?? []).map(
          renderSection,
        )}
      </Page>
    </Document>
  );
}
