import React from "react";
import { Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { HighlightRule } from "@/lib/resume/types";

export function HighlightText({
  text,
  highlights,
  style,
}: {
  text: string;
  highlights?: HighlightRule[];
  style?: Style | Style[];
}) {
  if (!text) return null;
  if (!highlights || highlights.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  // Filter out empty text rules
  const validRules = highlights.filter((h) => h.text.trim().length > 0);
  if (validRules.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  // Create a regex to match any of the highlight texts, case-insensitive
  const escapedTerms = validRules.map((h) =>
    h.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");

  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        // Even indices are non-matching parts (from split)
        if (i % 2 === 0) {
          return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
        }

        // Odd indices are matching parts
        const matchedRule = validRules.find(
          (h) => h.text.toLowerCase() === part.toLowerCase(),
        );
        const bgColor = matchedRule ? matchedRule.color : "yellow";

        return (
          <Text key={i} style={{ backgroundColor: bgColor }}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}
