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
import { agencyContactLine, contactItems, degreeLine, sectionPresence } from "./shared";

/**
 * Modern — single column with a subtle accent and a left-aligned header. The
 * accent color and layout density come from `meta` (theme.ts), so it stays
 * ATS-safe (one column, real text) while being customizable.
 */

const TEXT = "#1a1a1a";
const MUTED = "#555555";
const DEFAULT_ACCENT = "#2563eb";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      paddingTop: sc.s(38),
      paddingBottom: sc.s(42),
      paddingHorizontal: sc.s(46),
      fontFamily: font.regular,
      fontSize: sc.f(10),
      color: TEXT,
      lineHeight: sc.l(1.4),
    },
    header: { marginBottom: sc.s(12) },
    name: {
      fontSize: sc.f(22),
      fontFamily: font.bold,
      color: accent,
      lineHeight: sc.l(1.15),
    },
    label: { fontSize: sc.f(11), color: MUTED, marginTop: sc.s(2) },
    contact: { fontSize: sc.f(9), color: MUTED, marginTop: sc.s(6) },
    contactSep: { color: "#bbbbbb" },
    link: { color: MUTED, textDecoration: "none" },

    section: { marginTop: sc.s(13) },
    sectionTitle: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      borderBottomWidth: 1.5,
      borderBottomColor: accent,
      paddingBottom: sc.s(2),
      marginBottom: sc.s(6),
    },
    summary: { fontSize: sc.f(10) },

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
    bulletGlyph: { width: sc.s(12), color: accent, fontSize: sc.f(10) },
    bulletText: { flex: 1, fontSize: sc.f(10) },

    skillRow: { flexDirection: "row", marginBottom: sc.s(3) },
    skillCategory: { fontFamily: font.bold, fontSize: sc.f(10) },
    skillKeywords: { flex: 1, fontSize: sc.f(10) },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function SectionTitle({ styles, children }: { styles: Styles; children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Bullet({ styles, glyph, highlights, children }: { styles: Styles; glyph: string; highlights?: HighlightRule[]; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>{glyph}</Text>
      <HighlightText text={children} highlights={highlights} style={styles.bulletText} />
    </View>
  );
}

export function Modern({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const agencyBranding = data.meta.agencyBranding;
  const agencyContact = agencyContactLine(agencyBranding);
  const items = contactItems(basics, agencyBranding);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const secondary = resolveSecondary(data.meta.secondaryColor);
  const bulletGlyph = resolveBulletGlyph(data.meta.bulletStyle);
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
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "summary")}</SectionTitle>
            <HighlightText text={basics.summary} highlights={data.meta.highlights} style={styles.summary} />
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.section}>
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "work")}</SectionTitle>
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
                  <HighlightText text={w.summary} highlights={data.meta.highlights} style={styles.entrySummary} />
                ) : null}
                {w.highlights.map((h, i) => (
                  <Bullet key={i} styles={styles} glyph={bulletGlyph} highlights={data.meta.highlights}>
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
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "education")}</SectionTitle>
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
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "projects")}</SectionTitle>
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
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "skills")}</SectionTitle>
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
            <SectionTitle styles={styles}>{resolveSectionTitle(data.meta, "certificates")}</SectionTitle>
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
          <CustomSectionView highlights={data.meta.highlights} bullet={bulletGlyph}
            frame={(title, body) => (
              <View style={styles.section}>
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
        <View style={agencyBranding?.logoBase64 ? [styles.header, { paddingRight: sc.s(90) }] : styles.header}>
          <Text style={styles.name}>{basics.name || "Your Name"}</Text>
          {basics.label ? <Text style={secondary ? [styles.label, { color: secondary }] : styles.label}>{basics.label}</Text> : null}
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
          {agencyContact ? (
            <Text style={[styles.contact, { marginTop: sc.s(4), fontSize: sc.f(9) }]}>{agencyContact}</Text>
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
