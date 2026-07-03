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
import { customIdFromKey, resolveSectionOrder } from "@/lib/resume/sections";
import { makeScale, resolveAccent, resolveSecondary, resolveFont, type ResolvedFont, type Scale } from "@/lib/resume/theme";
import { ensureFontRegistered } from "@/lib/resume/fonts";
import type { HighlightRule, ResumeData, SectionKey } from "@/lib/resume/types";
import { CustomSectionView } from "./CustomSection";
import { agencyContactLine, contactItems, degreeLine, sectionPresence } from "./shared";

/**
 * Executive — a structured two-part header (name left, contact stacked right)
 * over a bold accent rule, with left-aligned headings underlined by a short
 * accent bar. Corporate and confident. Single column → ATS-friendly.
 */

const TEXT = "#1a1a1a";
const MUTED = "#52525b";
const DEFAULT_ACCENT = "#1e40af";

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

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      borderBottomWidth: 2,
      borderBottomColor: accent,
      paddingBottom: sc.s(8),
      marginBottom: sc.s(14),
    },
    headerLeft: { flex: 1, paddingRight: sc.s(12) },
    name: { fontSize: sc.f(23), fontFamily: font.bold, lineHeight: sc.l(1.12) },
    label: { fontSize: sc.f(11.5), color: accent, marginTop: sc.s(2) },
    headerRight: { alignItems: "flex-end", flexShrink: 0 },
    contactLine: { fontSize: sc.f(9), color: MUTED, marginBottom: sc.s(1.5) },
    link: { color: MUTED, textDecoration: "none" },

    section: { marginTop: sc.s(13) },
    titleWrap: { marginBottom: sc.s(6) },
    title: {
      fontSize: sc.f(11),
      fontFamily: font.bold,
      color: accent,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    titleUnderline: {
      width: sc.s(28),
      height: 2,
      backgroundColor: accent,
      marginTop: sc.s(3),
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

function SectionTitle({ styles, children }: { styles: Styles; children: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{children}</Text>
      <View style={styles.titleUnderline} />
    </View>
  );
}

function Bullet({ styles, highlights, children }: { styles: Styles; highlights?: HighlightRule[]; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <HighlightText text={children} highlights={highlights} style={styles.bulletText} />
    </View>
  );
}

export function Executive({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  const { basics, work, education, projects, skills, certificates } = data;
  const has = sectionPresence(data);
  const agencyBranding = data.meta.agencyBranding;
  const agencyContact = agencyContactLine(agencyBranding);
  const items = contactItems(basics, agencyBranding);
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const secondary = resolveSecondary(data.meta.secondaryColor);
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
            <HighlightText text={basics.summary} highlights={data.meta.highlights} style={styles.summary} />
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
                  <HighlightText text={w.summary} highlights={data.meta.highlights} style={styles.entrySummary} />
                ) : null}
                {w.highlights.map((h, i) => (
                  <Bullet key={i} styles={styles} highlights={data.meta.highlights}>
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
                  <HighlightText text={p.description} highlights={data.meta.highlights} style={styles.entrySummary} />
                ) : null}
                {p.highlights.map((h, i) => (
                  <Bullet key={i} styles={styles} highlights={data.meta.highlights}>
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
          <CustomSectionView highlights={data.meta.highlights}
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
      title={basics.name ? `${basics.name} — Résumé` : "Résumé"}
      author={basics.name || undefined}
    >
      <Page size={data.meta.pageSize ?? "LETTER"} style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{basics.name || "Your Name"}</Text>
            {basics.label ? (
              <Text style={secondary ? [styles.label, { color: secondary }] : styles.label}>{basics.label}</Text>
            ) : null}
          </View>
          {items.length > 0 || agencyContact || agencyBranding?.logoBase64 ? (
            <View style={styles.headerRight}>
              {agencyBranding?.logoBase64 && (
                <Image src={agencyBranding.logoBase64} style={{ width: sc.s(80), height: sc.s(50), objectFit: "contain", objectPositionX: "right", marginBottom: sc.s(4) }} />
              )}
              {items.map((it, i) =>
                it.href ? (
                  <Link key={i} src={it.href} style={styles.contactLine}>
                    {it.text}
                  </Link>
                ) : (
                  <Text key={i} style={styles.contactLine}>
                    {it.text}
                  </Text>
                ),
              )}
              {agencyContact ? (
                <Text style={[styles.contactLine, { marginTop: sc.s(2), fontSize: sc.f(8) }]}>
                  {agencyContact}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {resolveSectionOrder(data.meta, data.customSections ?? []).map(renderSection)}
      </Page>
    </Document>
  );
}
