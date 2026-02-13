import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { BooleanWithinNode } from "./boolean-within-node";

describe("BooleanWithinNode", () => {
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

  const node = new BooleanWithinNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-within",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for point within polygon", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.5, 0.5],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns true for point at polygon center", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.5, 0.5],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns false for point outside polygon", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns false for point on polygon boundary", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns true for polygon within polygon", async () => {
    const innerPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0.25, 0.25],
            [0.25, 0.75],
            [0.75, 0.75],
            [0.75, 0.25],
            [0.25, 0.25],
          ],
        ],
      },
    };
    const outerPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: innerPolygon,
      feature2: outerPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns false for polygon partially overlapping", async () => {
    const polygon1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };
    const polygon2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0.5, 0.5],
            [0.5, 1.5],
            [1.5, 1.5],
            [1.5, 0.5],
            [0.5, 0.5],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: polygon1,
      feature2: polygon2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns false for polygon containing the other", async () => {
    const innerPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0.25, 0.25],
            [0.25, 0.75],
            [0.75, 0.75],
            [0.75, 0.25],
            [0.25, 0.25],
          ],
        ],
      },
    };
    const outerPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: outerPolygon,
      feature2: innerPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns true for line within polygon", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0.25, 0.25],
          [0.75, 0.75],
        ],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: line,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns false for line crossing polygon boundary", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.5, 0.5],
          [1.5, 0.5],
        ],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: line,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns true for identical polygons", async () => {
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: polygon,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns true for identical points", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.5, 0.5],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: point,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns false for different points", async () => {
    const point1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const point2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1],
      },
    };

    const context = createMockContext({
      feature1: point1,
      feature2: point2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns true for geometry objects", async () => {
    const point = {
      type: "Point",
      coordinates: [0.5, 0.5],
    };
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ],
      ],
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns true for point within large polygon", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [50, 50],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 100],
            [100, 100],
            [100, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns false for point outside large polygon", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [150, 150],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 100],
            [100, 100],
            [100, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns true for small polygon within large polygon", async () => {
    const smallPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [25, 25],
            [25, 75],
            [75, 75],
            [75, 25],
            [25, 25],
          ],
        ],
      },
    };
    const largePolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 100],
            [100, 100],
            [100, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: smallPolygon,
      feature2: largePolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(true);
  });

  it("returns false for small polygon partially outside large polygon", async () => {
    const smallPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [75, 75],
            [75, 125],
            [125, 125],
            [125, 75],
            [75, 75],
          ],
        ],
      },
    };
    const largePolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 100],
            [100, 100],
            [100, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: smallPolygon,
      feature2: largePolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.within).toBe(false);
  });

  it("returns an error for missing feature1 input", async () => {
    const context = createMockContext({
      feature2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature1 input");
  });

  it("returns an error for missing feature2 input", async () => {
    const context = createMockContext({
      feature1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0.5, 0.5],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature2 input");
  });

  it("returns an error for null feature1 input", async () => {
    const context = createMockContext({
      feature1: null,
      feature2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature1 input");
  });

  it("returns an error for null feature2 input", async () => {
    const context = createMockContext({
      feature1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0.5, 0.5],
        },
      },
      feature2: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature2 input");
  });

  it("returns an error for undefined feature1 input", async () => {
    const context = createMockContext({
      feature1: undefined,
      feature2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature1 input");
  });

  it("returns an error for undefined feature2 input", async () => {
    const context = createMockContext({
      feature1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0.5, 0.5],
        },
      },
      feature2: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature2 input");
  });
});
