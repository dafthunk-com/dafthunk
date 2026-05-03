import { describe, expect, it } from "vitest";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

describe("resolveWordPressSite", () => {
  it("prefers an explicit override", () => {
    expect(
      resolveWordPressSite(
        { metadata: { primaryBlogUrl: "https://x.com" } },
        "other.example.com"
      )
    ).toBe("other.example.com");
  });

  it("falls back to the host of primaryBlogUrl", () => {
    expect(
      resolveWordPressSite({
        metadata: { primaryBlogUrl: "https://example.wordpress.com/blog" },
      })
    ).toBe("example.wordpress.com");
  });

  it("falls back to the numeric primaryBlogId", () => {
    expect(resolveWordPressSite({ metadata: { primaryBlogId: 12345 } })).toBe(
      "12345"
    );
  });

  it("returns null when there is no metadata", () => {
    expect(resolveWordPressSite({})).toBeNull();
  });

  it("returns null when metadata has no site fields", () => {
    expect(resolveWordPressSite({ metadata: { username: "x" } })).toBeNull();
  });
});

describe("wordPressApiUrl", () => {
  it("encodes the site segment and trims the leading slash from path", () => {
    expect(wordPressApiUrl("example.com", "/posts")).toBe(
      "https://public-api.wordpress.com/wp/v2/sites/example.com/posts"
    );
  });

  it("hits the v1.1 base when requested", () => {
    expect(
      wordPressApiUrl("example.com", "", undefined, { apiVersion: "v1.1" })
    ).toBe("https://public-api.wordpress.com/rest/v1.1/sites/example.com/");
  });

  it("appends string and numeric query params", () => {
    const url = wordPressApiUrl("example.com", "posts", {
      search: "hello world",
      per_page: 5,
    });
    expect(url).toContain("search=hello+world");
    expect(url).toContain("per_page=5");
  });

  it("skips empty/null/undefined query params", () => {
    const url = new URL(
      wordPressApiUrl("example.com", "posts", {
        search: "",
        page: undefined,
        categories: null,
        per_page: 10,
      })
    );
    expect(url.searchParams.has("search")).toBe(false);
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("categories")).toBe(false);
    expect(url.searchParams.get("per_page")).toBe("10");
  });
});
