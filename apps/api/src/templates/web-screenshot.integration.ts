import { describe, expect, it } from "vitest";

import { webScreenshotTemplate } from "./web-screenshot";

describe("Web Screenshot Template", () => {
  it("should have valid structure", () => {
    expect(webScreenshotTemplate.nodes).toHaveLength(3);
    expect(webScreenshotTemplate.edges).toHaveLength(2);

    const nodeIds = new Set(webScreenshotTemplate.nodes.map((n) => n.id));
    for (const edge of webScreenshotTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(webScreenshotTemplate.id).toBe("web-screenshot");
    expect(webScreenshotTemplate.name).toBe("Web Screenshot");
    expect(webScreenshotTemplate.type).toBe("manual");
    expect(webScreenshotTemplate.tags).toContain("browser");
    expect(webScreenshotTemplate.tags).toContain("screenshot");
  });

  it("should have correct node configuration", () => {
    const urlNode = webScreenshotTemplate.nodes.find(
      (n) => n.id === "url-input"
    );
    expect(urlNode).toBeDefined();
    expect(urlNode?.type).toBe("text-input");

    const screenshotNode = webScreenshotTemplate.nodes.find(
      (n) => n.id === "screenshot-capture"
    );
    expect(screenshotNode).toBeDefined();
    expect(screenshotNode?.type).toBe("cloudflare-browser-screenshot");

    const previewNode = webScreenshotTemplate.nodes.find(
      (n) => n.id === "screenshot-preview"
    );
    expect(previewNode).toBeDefined();
    expect(previewNode?.type).toBe("output-image");
  });

  it("should have correct edge connections", () => {
    const edges = webScreenshotTemplate.edges;

    const urlToScreenshot = edges.find(
      (e) => e.source === "url-input" && e.target === "screenshot-capture"
    );
    expect(urlToScreenshot).toBeDefined();
    expect(urlToScreenshot?.sourceOutput).toBe("value");
    expect(urlToScreenshot?.targetInput).toBe("url");

    const screenshotToPreview = edges.find(
      (e) =>
        e.source === "screenshot-capture" && e.target === "screenshot-preview"
    );
    expect(screenshotToPreview).toBeDefined();
    expect(screenshotToPreview?.sourceOutput).toBe("image");
    expect(screenshotToPreview?.targetInput).toBe("value");
  });
});
