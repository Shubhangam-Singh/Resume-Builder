/**
 * Custom font registration for @react-pdf/renderer.
 *
 * The TTFs are bundled in /public/fonts and served from our own origin — no
 * CDN, works offline, and the glyphs embed into the exported PDF. react-pdf
 * only parses TTF (not woff/woff2), so these must be .ttf files.
 *
 * Each font registers two families to match the built-in convention used by the
 * templates ("Helvetica" / "Helvetica-Bold"):
 *   - "{Family}"      → regular  (font.regular in ResolvedFont)
 *   - "{Family}-Bold" → bold     (font.bold in ResolvedFont)
 *
 * Call ensureFontRegistered(fontId) at the top of every PDF template before
 * styles are computed. It is a no-op for built-in fonts and for repeat calls.
 */
import { Font } from "@react-pdf/renderer";

const DEFINITIONS: Record<
  string,
  { family: string; regularSrc: string; boldSrc: string }
> = {
  lato: {
    family: "Lato",
    regularSrc: "/fonts/Lato-Regular.ttf",
    boldSrc: "/fonts/Lato-Bold.ttf",
  },
  poppins: {
    family: "Poppins",
    regularSrc: "/fonts/Poppins-Regular.ttf",
    boldSrc: "/fonts/Poppins-Bold.ttf",
  },
  crimson: {
    family: "Crimson Text",
    regularSrc: "/fonts/CrimsonText-Regular.ttf",
    boldSrc: "/fonts/CrimsonText-Bold.ttf",
  },
};

const registered = new Set<string>();

/**
 * Call before rendering any PDF that might use an uploaded custom font.
 * Registers the font with react-pdf from its stored data URL. Idempotent.
 */
export function prepareUploadedFont(
  uploaded: { family: string; dataUrl: string } | undefined | null,
): void {
  if (!uploaded) return;
  const { family, dataUrl } = uploaded;
  if (registered.has(family)) return;
  registered.add(family);
  Font.register({ family, src: dataUrl });
}

export function ensureFontRegistered(fontId: string | undefined): void {
  if (!fontId) return;
  const def = DEFINITIONS[fontId];
  if (!def || registered.has(fontId)) return;
  registered.add(fontId);

  Font.register({ family: def.family, src: def.regularSrc });
  Font.register({ family: `${def.family}-Bold`, src: def.boldSrc });
}
