import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatMonthYear } from "@/lib/resume/format";
import type { ResolvedFont, Scale } from "@/lib/resume/theme";
import type { CustomSection, DateFormat } from "@/lib/resume/types";

/**
 * A self-contained renderer for user-defined custom sections. It builds its own
 * styles from the resume's accent / scale / font so it blends into any template
 * (single- or multi-column) without depending on each template's style object.
 * Returns null when the section has nothing worth showing.
 */

const TEXT = "#1a1a1a";
const MUTED = "#444444";

function makeStyles(accent: string, sc: Scale, font: ResolvedFont) {
  return StyleSheet.create({
    section: { marginTop: sc.s(12) },
    title: {
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
    entry: { marginBottom: sc.sp(8) },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryTitle: { fontSize: sc.f(10.5), fontFamily: font.bold, flex: 1 },
    link: { color: accent, textDecoration: "none" },
    meta: {
      fontSize: sc.f(9.5),
      color: MUTED,
      textAlign: "right",
      flexShrink: 0,
      marginLeft: sc.s(12),
    },
    description: { fontSize: sc.f(10), color: TEXT, marginTop: sc.s(2) },
    bulletRow: { flexDirection: "row", marginTop: sc.sp(2), paddingRight: sc.s(4) },
    bulletGlyph: { width: sc.s(12), fontSize: sc.f(10), color: accent },
    bulletText: { flex: 1, fontSize: sc.f(10) },
  });
}

export function CustomSectionView({
  section,
  accent,
  sc,
  font,
  dateFormat,
}: {
  section: CustomSection;
  accent: string;
  sc: Scale;
  font: ResolvedFont;
  dateFormat?: DateFormat;
}) {
  const items = section.items.filter(
    (it) => it.name || it.description || it.highlights.length || it.date,
  );
  if (!section.title.trim() && items.length === 0) return null;

  const styles = makeStyles(accent, sc, font);

  return (
    <View key={`custom:${section.id}`} style={styles.section}>
      <Text style={styles.title}>{section.title || "Section"}</Text>
      {items.map((it) => {
        const date = formatMonthYear(it.date, dateFormat);
        return (
          <View key={it.id} style={styles.entry} wrap={false}>
            {it.name || date ? (
              <View style={styles.headerRow}>
                <Text style={styles.entryTitle}>
                  {it.url ? (
                    <Link style={styles.link} src={it.url}>
                      {it.name}
                    </Link>
                  ) : (
                    it.name
                  )}
                </Text>
                {date ? <Text style={styles.meta}>{date}</Text> : null}
              </View>
            ) : null}
            {it.description ? (
              <Text style={styles.description}>{it.description}</Text>
            ) : null}
            {it.highlights.map((h, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletGlyph}>•</Text>
                <Text style={styles.bulletText}>{h}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
