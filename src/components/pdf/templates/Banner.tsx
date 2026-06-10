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
import { agencyContactLine, contactItems, degreeLine, sectionPresence } from "./shared";

/**
 * Banner — a bold accent header band (photo + name + contact) over a single
 * column body with filled "chip" section labels. Eye-catching for human
 * reviewers; the colored banner + photo make it ATS-risky.
 */

const TEXT = "#1f2937";
const MUTED = "#5b6675";
const ON_ACCENT = "#ffffff";
const ON_ACCENT_SOFT = "#e8eef2";
const DEFAULT_ACCENT = "#1d4ed8";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    page: {
      fontFamily: font.regular,
      fontSize: sc.f(10),
      color: TEXT,
      lineHeight: sc.l(1.4),
    },

    banner: {
      backgroundColor: accent,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: sc.s(22),
      paddingHorizontal: sc.s(40),
    },
    photo: {
      width: sc.s(66),
      height: sc.s(66),
      borderRadius: sc.s(33),
      objectFit: "cover",
      borderWidth: 2,
      borderColor: ON_ACCENT,
      marginRight: sc.s(16),
    },
    avatar: {
      width: sc.s(66),
      height: sc.s(66),
      borderRadius: sc.s(33),
      backgroundColor: ON_ACCENT,
      alignItems: "center",
      justifyContent: "center",
      marginRight: sc.s(16),
    },
    avatarText: { color: accent, fontSize: sc.f(22), fontFamily: font.bold },
    bannerText: { flex: 1 },
    name: {
      fontSize: sc.f(22),
      fontFamily: font.bold,
      color: ON_ACCENT,
      lineHeight: sc.l(1.12),
    },
    role: { fontSize: sc.f(11.5), color: ON_ACCENT_SOFT, marginTop: sc.s(1) },
    bannerContact: { fontSize: sc.f(9), color: ON_ACCENT_SOFT, marginTop: sc.s(6) },
    bannerSep: { color: ON_ACCENT_SOFT },
    bannerLink: { color: ON_ACCENT_SOFT, textDecoration: "none" },

    body: {
      paddingHorizontal: sc.s(40),
      paddingTop: sc.s(16),
      paddingBottom: sc.s(28),
    },
    section: { marginBottom: sc.s(11) },
    chip: {
      alignSelf: "flex-start",
      backgroundColor: accent,
      paddingVertical: sc.s(2),
      paddingHorizontal: sc.s(7),
      marginBottom: sc.s(6),
    },
    chipText: {
      color: ON_ACCENT,
      fontSize: sc.f(9),
      fontFamily: font.bold,
      letterSpacing: 0.8,
      textTransform: "uppercase",
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

    link: { color: accent, textDecoration: "none" },
    skillRow: { flexDirection: "row", marginBottom: sc.s(3) },
    skillCategory: { fontFamily: font.bold, fontSize: sc.f(10) },
    skillKeywords: { flex: 1, fontSize: sc.f(10) },
  });
}

type Styles = ReturnType<typeof makeStyles>;

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "•"
  );
}

function Chip({ styles, children }: { styles: Styles; children: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

function Bullet({ styles, children }: { styles: Styles; children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletGlyph}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Banner({ data }: { data: ResumeData }) {
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
            <Chip styles={styles}>Summary</Chip>
            <Text style={styles.summary}>{basics.summary}</Text>
          </View>
        ) : null;
      case "work":
        return has.work ? (
          <View key="work" style={styles.section}>
            <Chip styles={styles}>Experience</Chip>
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
            <Chip styles={styles}>Education</Chip>
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
            <Chip styles={styles}>Projects</Chip>
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
            <Chip styles={styles}>Skills</Chip>
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
            <Chip styles={styles}>Certifications</Chip>
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
        <View style={styles.banner}>
          {basics.image ? (
            <Image style={styles.photo} src={basics.image} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initialsOf(basics.name || "")}
              </Text>
            </View>
          )}
          <View style={agencyBranding?.logoBase64 ? [styles.bannerText, { paddingRight: sc.s(90) }] : styles.bannerText}>
            <Text style={styles.name}>{basics.name || "Your Name"}</Text>
            {basics.label ? <Text style={styles.role}>{basics.label}</Text> : null}
            {items.length > 0 ? (
              <Text style={styles.bannerContact}>
                {items.map((it, i) => (
                  <Text key={i}>
                    {i > 0 ? (
                      <Text style={styles.bannerSep}>{"   ·   "}</Text>
                    ) : null}
                    {it.href ? (
                      <Link style={styles.bannerLink} src={it.href}>
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
              <Text style={[styles.bannerContact, { marginTop: sc.s(2), fontSize: sc.f(8) }]}>
                {agencyContact}
              </Text>
            ) : null}
          </View>
          {agencyBranding?.logoBase64 && (
            <Image src={agencyBranding.logoBase64} style={{ position: "absolute", top: sc.s(22), right: sc.s(40), width: sc.s(80), height: sc.s(50), objectFit: "contain", objectPositionX: "right" }} />
          )}
        </View>

        <View style={styles.body}>
          {resolveSectionOrder(data.meta, data.customSections ?? []).map(renderSection)}
        </View>
      </Page>
    </Document>
  );
}
