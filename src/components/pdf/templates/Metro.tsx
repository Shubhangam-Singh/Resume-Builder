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
import { customIdFromKey, resolveSectionOrder, resolveSectionTitle } from "@/lib/resume/sections";
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

const TEXT = "#111827";
const MUTED = "#4B5563";
const BORDER = "#E5E7EB";
const BG = "#F9FAFB";
const DEFAULT_ACCENT = "#2563EB";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      paddingTop: sc.s(32),
      paddingBottom: sc.s(32),
      paddingHorizontal: sc.s(32),
      fontFamily: font.regular,
      fontSize: sc.f(9.5),
      color: TEXT,
      lineHeight: sc.l(1.4),
      backgroundColor: "#ffffff",
    },

    headerCard: {
      backgroundColor: BG,
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: sc.s(6),
      padding: sc.s(16),
      marginBottom: sc.s(12),
    },
    name: {
      fontSize: sc.f(22),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 0.5,
      lineHeight: sc.l(1.2),
      marginBottom: sc.s(4),
    },
    label: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: MUTED,
      lineHeight: sc.l(1.2),
      marginBottom: sc.s(8),
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: sc.s(8),
    },
    contactItem: {
      fontSize: sc.f(9),
      color: MUTED,
      backgroundColor: "#ffffff",
      paddingVertical: sc.s(3),
      paddingHorizontal: sc.s(6),
      borderRadius: sc.s(4),
      borderWidth: 1,
      borderColor: BORDER,
    },
    link: { color: MUTED, textDecoration: "none" },

    sectionCard: {
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: sc.s(6),
      padding: sc.s(16),
      marginBottom: sc.s(12),
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: sc.s(10),
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingBottom: sc.s(6),
    },
    sectionTitle: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: accent,
      textTransform: "uppercase",
      letterSpacing: 1,
    },

    summary: { fontSize: sc.f(9.5), color: TEXT },

    entry: { marginBottom: sc.sp(10) },
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: sc.s(2),
    },
    entryTitle: { fontSize: sc.f(10.5), fontFamily: font.bold, color: TEXT },
    entrySubtitle: { fontSize: sc.f(10), color: accent, marginTop: sc.s(1) },
    entryMeta: {
      fontSize: sc.f(9),
      color: MUTED,
      textAlign: "right",
      flexShrink: 0,
      marginLeft: sc.s(12),
      backgroundColor: BG,
      paddingVertical: sc.s(2),
      paddingHorizontal: sc.s(6),
      borderRadius: sc.s(4),
    },
    entrySummary: { fontSize: sc.f(9.5), marginTop: sc.s(3), color: MUTED },

    bulletRow: { flexDirection: "row", marginTop: sc.sp(3), paddingRight: sc.s(4) },
    bulletGlyph: { width: sc.s(10), fontSize: sc.f(9.5), color: accent },
    bulletText: { flex: 1, fontSize: sc.f(9.5) },

    skillGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: sc.s(6),
    },
    skillBadge: {
      backgroundColor: BG,
      borderWidth: 1,
      borderColor: BORDER,
      paddingVertical: sc.s(3),
      paddingHorizontal: sc.s(6),
      borderRadius: sc.s(4),
      fontSize: sc.f(9.5),
      color: TEXT,
    },
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
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

export function Metro({ data }: { data: ResumeData }) {
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
          <View key="summary" style={styles.sectionCard} wrap={false}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "summary")}</SectionTitle>
            <HighlightText text={basics.summary} highlights={data.meta.highlights} style={styles.summary} />
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.sectionCard}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "work")}</SectionTitle>
            {work.map((w, i) => {
              const dates = formatDateRange(w.startDate, w.endDate);
              return (
                <View key={w.id} style={{ ...styles.entry, marginBottom: i === work.length - 1 ? 0 : sc.sp(10) }} wrap={false}>
                  <View style={styles.entryHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle}>{w.position || w.name}</Text>
                      {w.position && w.name ? (
                        <Text style={styles.entrySubtitle}>{w.name}</Text>
                      ) : null}
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
          <View key="education" style={styles.sectionCard}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "education")}</SectionTitle>
            {education.map((e, i) => {
              const dates = formatDateRange(e.startDate, e.endDate);
              const degree = [e.studyType, e.area].filter(Boolean).join(", ");
              return (
                <View key={e.id} style={{ ...styles.entry, marginBottom: i === education.length - 1 ? 0 : sc.sp(10) }} wrap={false}>
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
          <View key="projects" style={styles.sectionCard}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "projects")}</SectionTitle>
            {projects.map((p, i) => (
              <View key={p.id} style={{ ...styles.entry, marginBottom: i === projects.length - 1 ? 0 : sc.sp(10) }} wrap={false}>
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
          <View key="skills" style={styles.sectionCard} wrap={false}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "skills")}</SectionTitle>
            <View style={styles.skillGrid}>
              {skills.map((s) => (
                s.keywords.map((kw, i) => (
                  <Text key={`${s.id}-${i}`} style={styles.skillBadge}>
                    {s.name ? `${s.name}: ` : ""}{kw}
                  </Text>
                ))
              ))}
            </View>
          </View>
        ) : null;
      case "certificates":
        return has.certificates ? (
          <View key="certificates" style={styles.sectionCard}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "certificates")}</SectionTitle>
            {certificates.map((c, i) => {
              const meta = [c.issuer, formatMonthYear(c.date)]
                .filter(Boolean)
                .join("  ·  ");
              return (
                <View key={c.id} style={{ ...styles.entry, marginBottom: i === certificates.length - 1 ? 0 : sc.sp(10) }} wrap={false}>
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
            frame={(title, body) => (
              <View style={styles.sectionCard}>
                <SectionTitle styles={styles}>{title}</SectionTitle>
                {body}
              </View>
            )}
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
        <View style={agencyBranding?.logoBase64 ? [styles.headerCard, { paddingRight: sc.s(90) }] : styles.headerCard}>
          <Text style={styles.name}>{basics.name || "Your Name"}</Text>
          {basics.label ? <Text style={secondary ? [styles.label, { color: secondary }] : styles.label}>{basics.label}</Text> : null}
          {contactNodes.length > 0 ? (
            <View style={styles.contactRow}>
              {contactNodes.map((node, i) => (
                <Text key={i} style={styles.contactItem}>{node}</Text>
              ))}
            </View>
          ) : null}
          {agencyContact ? (
            <Text style={{ color: MUTED, fontSize: sc.f(9), marginTop: sc.s(8) }}>{agencyContact}</Text>
          ) : null}
          {agencyBranding?.logoBase64 && (
            <Image src={agencyBranding.logoBase64} style={{ position: "absolute", top: sc.s(16), right: sc.s(16), width: sc.s(80), height: sc.s(50), objectFit: "contain", objectPositionX: "right" }} />
          )}
        </View>

        {resolveSectionOrder(data.meta, data.customSections ?? []).map(
          renderSection,
        )}
      </Page>
    </Document>
  );
}
