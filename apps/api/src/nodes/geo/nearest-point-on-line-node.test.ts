import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { NearestPointOnLineNode } from "./nearest-point-on-line-node";

describe("NearestPointOnLineNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    mode: "dev" as const,
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new NearestPointOnLineNode({
    id: "test-node",
    name: "Test Node",
    type: "nearest-point-on-line",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns Point for basic nearest point operation", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for LineString geometry input", async () => {
    const context = createMockContext({
      lines: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [4, 0],
        ],
      },
      pt: {
        type: "Point",
        coordinates: [2, 2],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for MultiLineString input", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [2, 0],
            ],
            [
              [4, 0],
              [6, 0],
            ],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [3, 2],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point with custom units", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: "miles",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point with degrees units", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: "degrees",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point with radians units", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: "radians",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point with kilometers units", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: "kilometers",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for simple coordinates", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [8, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [4, 3],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for point on line", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for diagonal line", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 4],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 1],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for short line", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0.5, 2],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns Point for point at line endpoint", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [5, 0],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("handles null units gracefully", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("handles undefined units gracefully", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.nearest).toBeDefined();
    expect(result.outputs?.nearest.type).toBe("Feature");
    expect(result.outputs?.nearest.geometry.type).toBe("Point");
  });

  it("returns an error for missing lines input", async () => {
    const context = createMockContext({
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing lines input");
  });

  it("returns an error for missing pt input", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing pt input");
  });

  it("returns an error for non-string units", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: 123,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Units must be a string");
  });

  it("returns an error for invalid units", async () => {
    const context = createMockContext({
      lines: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
          ],
        },
      },
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      units: "invalid",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Units must be one of: degrees, radians, miles, kilometers"
    );
  });
});
