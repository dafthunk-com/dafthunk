import { describe, expect, it } from "vitest";

import { imageProcessingTemplate } from "./image-processing";

describe("Image Processing Template", () => {
  it("should have valid structure", () => {
    expect(imageProcessingTemplate.nodes).toHaveLength(5);
    expect(imageProcessingTemplate.edges).toHaveLength(4);

    const nodeIds = new Set(imageProcessingTemplate.nodes.map((n) => n.id));
    for (const edge of imageProcessingTemplate.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should have correct template metadata", () => {
    expect(imageProcessingTemplate.id).toBe("image-processing");
    expect(imageProcessingTemplate.name).toBe("Image Processing");
    expect(imageProcessingTemplate.trigger).toBe("manual");
    expect(imageProcessingTemplate.tags).toContain("webcam");
    expect(imageProcessingTemplate.tags).toContain("photon");
    expect(imageProcessingTemplate.tags).toContain("pop-art");
  });

  it("should have correct node configuration", () => {
    const webcamNode = imageProcessingTemplate.nodes.find(
      (n) => n.id === "webcam-capture"
    );
    expect(webcamNode).toBeDefined();
    expect(webcamNode?.type).toBe("webcam-input");

    const invertNode = imageProcessingTemplate.nodes.find(
      (n) => n.id === "invert-colors"
    );
    expect(invertNode).toBeDefined();
    expect(invertNode?.type).toBe("photon-invert-colors");

    const contrastNode = imageProcessingTemplate.nodes.find(
      (n) => n.id === "high-contrast"
    );
    expect(contrastNode).toBeDefined();
    expect(contrastNode?.type).toBe("photon-adjust-contrast");

    const pixelizeNode = imageProcessingTemplate.nodes.find(
      (n) => n.id === "pixelize"
    );
    expect(pixelizeNode).toBeDefined();
    expect(pixelizeNode?.type).toBe("photon-pixelize");

    const previewNode = imageProcessingTemplate.nodes.find(
      (n) => n.id === "result-preview"
    );
    expect(previewNode).toBeDefined();
    expect(previewNode?.type).toBe("output-image");
  });

  it("should have correct edge connections forming a pipeline", () => {
    const edges = imageProcessingTemplate.edges;

    const webcamToInvert = edges.find(
      (e) => e.source === "webcam-capture" && e.target === "invert-colors"
    );
    expect(webcamToInvert).toBeDefined();
    expect(webcamToInvert?.sourceOutput).toBe("image");
    expect(webcamToInvert?.targetInput).toBe("image");

    const invertToContrast = edges.find(
      (e) => e.source === "invert-colors" && e.target === "high-contrast"
    );
    expect(invertToContrast).toBeDefined();
    expect(invertToContrast?.sourceOutput).toBe("image");
    expect(invertToContrast?.targetInput).toBe("image");

    const contrastToPixelize = edges.find(
      (e) => e.source === "high-contrast" && e.target === "pixelize"
    );
    expect(contrastToPixelize).toBeDefined();
    expect(contrastToPixelize?.sourceOutput).toBe("image");
    expect(contrastToPixelize?.targetInput).toBe("image");

    const pixelizeToPreview = edges.find(
      (e) => e.source === "pixelize" && e.target === "result-preview"
    );
    expect(pixelizeToPreview).toBeDefined();
    expect(pixelizeToPreview?.sourceOutput).toBe("image");
    expect(pixelizeToPreview?.targetInput).toBe("value");
  });
});
