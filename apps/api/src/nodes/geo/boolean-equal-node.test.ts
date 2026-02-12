import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { BooleanEqualNode } from "./boolean-equal-node";

describe("BooleanEqualNode", () => {
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

  const node = new BooleanEqualNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-equal",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for identical point features", async () => {
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
        coordinates: [0, 0],
      },
    };

    const context = createMockContext({
      feature1: point1,
      feature2: point2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different point features", async () => {
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
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical line string features", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    };

    const context = createMockContext({
      feature1: line1,
      feature2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different line string features", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      },
    };

    const context = createMockContext({
      feature1: line1,
      feature2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical polygon features", async () => {
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
      feature1: polygon1,
      feature2: polygon2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different polygon features", async () => {
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
            [0, 0],
            [0, 2],
            [2, 2],
            [2, 0],
            [0, 0],
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
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical multi point features", async () => {
    const multiPoint1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    };
    const multiPoint2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    };

    const context = createMockContext({
      feature1: multiPoint1,
      feature2: multiPoint2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different multi point features", async () => {
    const multiPoint1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    };
    const multiPoint2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    };

    const context = createMockContext({
      feature1: multiPoint1,
      feature2: multiPoint2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical multi line string features", async () => {
    const multiLineString1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [2, 2],
            [3, 3],
          ],
        ],
      },
    };
    const multiLineString2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [2, 2],
            [3, 3],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: multiLineString1,
      feature2: multiLineString2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different multi line string features", async () => {
    const multiLineString1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
        ],
      },
    };
    const multiLineString2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [2, 2],
            [3, 3],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: multiLineString1,
      feature2: multiLineString2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical multi polygon features", async () => {
    const multiPolygon1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [2, 3],
              [3, 3],
              [3, 2],
              [2, 2],
            ],
          ],
        ],
      },
    };
    const multiPolygon2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [2, 3],
              [3, 3],
              [3, 2],
              [2, 2],
            ],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: multiPolygon1,
      feature2: multiPolygon2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different multi polygon features", async () => {
    const multiPolygon1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        ],
      },
    };
    const multiPolygon2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [2, 3],
              [3, 3],
              [3, 2],
              [2, 2],
            ],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature1: multiPolygon1,
      feature2: multiPolygon2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical geometry objects", async () => {
    const geometry1 = {
      type: "Point",
      coordinates: [5, 5],
    };
    const geometry2 = {
      type: "Point",
      coordinates: [5, 5],
    };

    const context = createMockContext({
      feature1: geometry1,
      feature2: geometry2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for different geometry types", async () => {
    const point = {
      type: "Point",
      coordinates: [0, 0],
    };
    const lineString = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };

    const context = createMockContext({
      feature1: point,
      feature2: lineString,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical features with different properties", async () => {
    const feature1 = {
      type: "Feature",
      properties: { name: "Point A" },
      geometry: {
        type: "Point",
        coordinates: [10, 20],
      },
    };
    const feature2 = {
      type: "Feature",
      properties: { name: "Point B" },
      geometry: {
        type: "Point",
        coordinates: [10, 20],
      },
    };

    const context = createMockContext({
      feature1: feature1,
      feature2: feature2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns false for features with same coordinates but different order", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [2, 2],
          [1, 1],
          [0, 0],
        ],
      },
    };

    const context = createMockContext({
      feature1: line1,
      feature2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(false);
  });

  it("returns true for identical large coordinate values", async () => {
    const point1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1000, 2000],
      },
    };
    const point2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1000, 2000],
      },
    };

    const context = createMockContext({
      feature1: point1,
      feature2: point2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isEqual).toBe(true);
  });

  it("returns an error for missing feature1 input", async () => {
    const context = createMockContext({
      feature2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
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
          coordinates: [0, 0],
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
          type: "Point",
          coordinates: [0, 0],
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
          coordinates: [0, 0],
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
          type: "Point",
          coordinates: [0, 0],
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
          coordinates: [0, 0],
        },
      },
      feature2: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature2 input");
  });
});
