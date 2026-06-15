/**
 * Font registry + loader for SVG text rendering.
 *
 * resvg has no access to system fonts in the Workers runtime, so the bytes of
 * every font referenced by an SVG must be supplied explicitly via
 * `font.fontBuffers`. Fonts are stored as TTFs in the RESSOURCES R2 bucket under
 * the `fonts/<dir>/<file>` prefix and fetched on demand. Loaded bytes are
 * memoized per isolate so warm isolates never refetch.
 */

export type FontSlot = "sans" | "serif" | "mono" | "emoji";

export interface FontEntry {
  /** CSS family name as it appears in an SVG `font-family`. */
  family: string;
  slot: FontSlot;
  /** R2 key of the regular (400) weight. */
  regular: string;
  /** R2 key of the bold (700) weight, when bundled. */
  bold?: string;
}

const key = (dir: string, file: string): string => `fonts/${dir}/${file}`;

/**
 * Available font families. Keys are stable slugs; `family` is matched against
 * the `font-family` referenced in the SVG. To add a font, upload its TTFs to
 * the RESSOURCES bucket (see scripts/seed-fonts) and add an entry here.
 */
export const FONT_REGISTRY: Record<string, FontEntry> = {
  inter: {
    family: "Inter",
    slot: "sans",
    regular: key("inter", "Inter_400Regular.ttf"),
    bold: key("inter", "Inter_700Bold.ttf"),
  },
  roboto: {
    family: "Roboto",
    slot: "sans",
    regular: key("roboto", "Roboto_400Regular.ttf"),
    bold: key("roboto", "Roboto_700Bold.ttf"),
  },
  montserrat: {
    family: "Montserrat",
    slot: "sans",
    regular: key("montserrat", "Montserrat_400Regular.ttf"),
    bold: key("montserrat", "Montserrat_700Bold.ttf"),
  },
  "noto-sans": {
    family: "Noto Sans",
    slot: "sans",
    regular: key("noto-sans", "NotoSans_400Regular.ttf"),
    bold: key("noto-sans", "NotoSans_700Bold.ttf"),
  },
  lora: {
    family: "Lora",
    slot: "serif",
    regular: key("lora", "Lora_400Regular.ttf"),
    bold: key("lora", "Lora_700Bold.ttf"),
  },
  "noto-serif": {
    family: "Noto Serif",
    slot: "serif",
    regular: key("noto-serif", "NotoSerif_400Regular.ttf"),
    bold: key("noto-serif", "NotoSerif_700Bold.ttf"),
  },
  "libre-baskerville": {
    family: "Libre Baskerville",
    slot: "serif",
    regular: key("libre-baskerville", "LibreBaskerville_400Regular.ttf"),
    bold: key("libre-baskerville", "LibreBaskerville_700Bold.ttf"),
  },
  "jetbrains-mono": {
    family: "JetBrains Mono",
    slot: "mono",
    regular: key("jetbrains-mono", "JetBrainsMono_400Regular.ttf"),
    bold: key("jetbrains-mono", "JetBrainsMono_700Bold.ttf"),
  },
  "roboto-mono": {
    family: "Roboto Mono",
    slot: "mono",
    regular: key("roboto-mono", "RobotoMono_400Regular.ttf"),
    bold: key("roboto-mono", "RobotoMono_700Bold.ttf"),
  },
  "noto-sans-mono": {
    family: "Noto Sans Mono",
    slot: "mono",
    regular: key("noto-sans-mono", "NotoSansMono_400Regular.ttf"),
    bold: key("noto-sans-mono", "NotoSansMono_700Bold.ttf"),
  },
  "noto-emoji": {
    family: "Noto Emoji",
    slot: "emoji",
    regular: key("noto-emoji", "NotoEmoji_400Regular.ttf"),
  },
};

/** Family used when a slot is requested but not explicitly referenced. */
const SLOT_DEFAULT: Record<FontSlot, string> = {
  sans: "inter",
  serif: "lora",
  mono: "jetbrains-mono",
  emoji: "noto-emoji",
};

/** CSS generic family keywords mapped to a slot's default font. */
const GENERIC: Record<string, FontSlot> = {
  "sans-serif": "sans",
  sans: "sans",
  "system-ui": "sans",
  "ui-sans-serif": "sans",
  serif: "serif",
  "ui-serif": "serif",
  monospace: "mono",
  mono: "mono",
  "ui-monospace": "mono",
};

const FAMILY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(FONT_REGISTRY).map(([slug, e]) => [
    e.family.toLowerCase(),
    slug,
  ])
);

// `font-family="..."` presentation attribute (single or double quoted).
const ATTR_RE = /font-family\s*=\s*"([^"]*)"|font-family\s*=\s*'([^']*)'/gi;
// `font-family: ...;` CSS declaration (inline style or <style> block).
const CSS_RE = /font-family\s*:\s*([^;}]+)/gi;
// Any pictographic codepoint (emoji) present in the markup.
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function addTokens(value: string, slugs: Set<string>): void {
  for (const raw of value.split(",")) {
    const token = raw
      .trim()
      .replace(/^['"]+|['"]+$/g, "")
      .toLowerCase();
    if (!token) continue;
    if (FAMILY_TO_SLUG[token]) slugs.add(FAMILY_TO_SLUG[token]);
    else if (GENERIC[token]) slugs.add(SLOT_DEFAULT[GENERIC[token]]);
  }
}

/**
 * Returns true when the SVG contains text that needs a font to render.
 */
export function svgHasText(svg: string): boolean {
  return /<text[\s>]/i.test(svg) || /<tspan[\s>]/i.test(svg);
}

/**
 * Inspects an SVG and returns the slugs of every registered font it references,
 * mapping generic CSS families (serif/sans-serif/monospace) to sensible
 * defaults and adding the emoji font when pictographic characters are present.
 * Inter is always included as the ultimate fallback.
 */
export function detectFontSlugs(svg: string): string[] {
  const slugs = new Set<string>();
  for (const m of svg.matchAll(ATTR_RE)) addTokens(m[1] ?? m[2] ?? "", slugs);
  for (const m of svg.matchAll(CSS_RE)) addTokens(m[1] ?? "", slugs);
  if (EMOJI_RE.test(svg)) slugs.add("noto-emoji");
  slugs.add("inter");
  return [...slugs];
}

const cache = new Map<string, Promise<Uint8Array>>();

function loadKey(bucket: R2Bucket, k: string): Promise<Uint8Array> {
  let promise = cache.get(k);
  if (!promise) {
    promise = (async () => {
      const object = await bucket.get(k);
      if (!object) throw new Error(`Font not found in resources bucket: ${k}`);
      return new Uint8Array(await object.arrayBuffer());
    })().catch((error) => {
      cache.delete(k); // don't memoize failures
      throw error;
    });
    cache.set(k, promise);
  }
  return promise;
}

export interface LoadedFonts {
  /** Raw TTF buffers to pass to resvg's `font.fontBuffers`. */
  buffers: Uint8Array[];
  defaultFontFamily: string;
  sansSerifFamily: string;
  serifFamily?: string;
  monospaceFamily?: string;
}

/**
 * Fetches the TTF bytes for the given font slugs from the resources bucket and
 * derives the family names resvg should use for each generic slot.
 */
export async function loadFonts(
  bucket: R2Bucket,
  slugs: string[]
): Promise<LoadedFonts> {
  const entries = slugs
    .map((slug) => FONT_REGISTRY[slug])
    .filter((entry): entry is FontEntry => Boolean(entry));

  const keys = new Set<string>();
  for (const entry of entries) {
    keys.add(entry.regular);
    if (entry.bold) keys.add(entry.bold);
  }

  const buffers = await Promise.all([...keys].map((k) => loadKey(bucket, k)));

  const familyForSlot = (slot: FontSlot): string | undefined =>
    entries.find((entry) => entry.slot === slot)?.family;

  const sans = familyForSlot("sans") ?? FONT_REGISTRY.inter.family;
  return {
    buffers,
    defaultFontFamily: sans,
    sansSerifFamily: sans,
    serifFamily: familyForSlot("serif"),
    monospaceFamily: familyForSlot("mono"),
  };
}
