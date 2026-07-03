import { createElement, type ReactElement } from "react";
import { Document, Link, Page, StyleSheet, Text, View, type DocumentProps } from "@react-pdf/renderer";

import { ensureFontRegistered, prepareUploadedFont } from "@/lib/resume/fonts";
import { resolveAccent, resolveFont, resolveSecondary } from "@/lib/resume/theme";
import type { ResumeData } from "@/lib/resume/types";
import { contactItems } from "./templates/shared";

/**
 * A one-page cover letter that inherits the resume's design choices (accent,
 * font, paper size) so the letter and resume read as a matched set.
 */

const TEXT = "#1a1a1a";
const MUTED = "#555555";
const DEFAULT_ACCENT = "#1f2937";

export function CoverLetterDocument({ data }: { data: ResumeData }) {
  ensureFontRegistered(data.meta.fontFamily);
  prepareUploadedFont(data.meta.uploadedFont);
  const { basics } = data;
  const accent = resolveAccent(data.meta.themeColor, DEFAULT_ACCENT);
  const secondary = resolveSecondary(data.meta.secondaryColor);
  const font = resolveFont(data.meta.fontFamily);
  const items = contactItems(basics);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 48,
      paddingBottom: 56,
      paddingHorizontal: 56,
      fontFamily: font.regular,
      fontSize: 10.5,
      color: TEXT,
      lineHeight: 1.55,
    },
    name: { fontSize: 20, fontFamily: font.bold, color: accent },
    label: { fontSize: 11, color: secondary ?? accent, marginTop: 2 },
    contact: { fontSize: 9, color: MUTED, marginTop: 6 },
    link: { color: MUTED, textDecoration: "none" },
    rule: {
      borderBottomWidth: 1.5,
      borderBottomColor: accent,
      marginTop: 12,
      marginBottom: 20,
    },
    date: { fontSize: 10, color: MUTED, marginBottom: 16 },
    paragraph: { marginBottom: 10 },
  });

  const paragraphs = (data.coverLetter?.text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document
      title={basics.name ? `${basics.name} — Cover Letter` : "Cover Letter"}
      author={basics.name || undefined}
    >
      <Page size={data.meta.pageSize ?? "LETTER"} style={styles.page}>
        <View>
          <Text style={styles.name}>{basics.name || "Your Name"}</Text>
          {basics.label ? <Text style={styles.label}>{basics.label}</Text> : null}
          {items.length > 0 ? (
            <Text style={styles.contact}>
              {items.map((it, i) => (
                <Text key={i}>
                  {i > 0 ? "  ·  " : null}
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
          <View style={styles.rule} />
        </View>

        <Text style={styles.date}>{today}</Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

/** Typed element builder for pdf(), mirroring buildResumeDocument. */
export function buildCoverLetterDocument(
  data: ResumeData,
): ReactElement<DocumentProps> {
  return createElement(CoverLetterDocument, { data }) as unknown as ReactElement<
    DocumentProps
  >;
}
