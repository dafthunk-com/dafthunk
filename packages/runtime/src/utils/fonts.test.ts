import { describe, expect, it } from "vitest";

import { detectFontSlugs, svgHasText } from "./fonts";

describe("svgHasText", () => {
  it("detects text and tspan elements", () => {
    expect(svgHasText("<svg><text>hi</text></svg>")).toBe(true);
    expect(svgHasText('<svg><tspan x="0">hi</tspan></svg>')).toBe(true);
  });

  it("returns false for shape-only SVGs", () => {
    expect(svgHasText('<svg><rect width="10" height="10"/></svg>')).toBe(false);
  });
});

describe("detectFontSlugs", () => {
  it("always includes inter as a fallback", () => {
    expect(detectFontSlugs("<svg></svg>")).toContain("inter");
  });

  it("matches a font-family presentation attribute", () => {
    const slugs = detectFontSlugs('<text font-family="Roboto Mono">x</text>');
    expect(slugs).toContain("roboto-mono");
  });

  it("matches a font-family from an inline style", () => {
    const slugs = detectFontSlugs(
      "<text style=\"fill:red; font-family: 'Lora', serif;\">x</text>"
    );
    expect(slugs).toContain("lora");
  });

  it("maps generic families to slot defaults", () => {
    const slugs = detectFontSlugs(
      "<style>text { font-family: monospace; }</style>"
    );
    expect(slugs).toContain("jetbrains-mono");
  });

  it("adds the emoji font when pictographic characters are present", () => {
    const slugs = detectFontSlugs('<text font-family="Inter">Hi 🎉</text>');
    expect(slugs).toContain("noto-emoji");
  });

  it("ignores unknown families (falling back to inter)", () => {
    const slugs = detectFontSlugs('<text font-family="Comic Sans MS">x</text>');
    expect(slugs).toEqual(["inter"]);
  });
});
