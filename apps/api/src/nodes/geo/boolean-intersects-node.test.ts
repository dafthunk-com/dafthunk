import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanIntersectsNode } from "./boolean-intersects-node";

describe("BooleanIntersectsNode", () => {
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

  const node = new BooleanIntersectsNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-intersects",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for intersecting line strings", async () => {
    const line1 = {
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
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 2],
          [2, 0],
        ],
      },
    };

    const context = createMockContext({
      feature1: line1,
      feature2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns false for non-intersecting line strings", async () => {
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
          [3, 3],
          [4, 4],
        ],
      },
    };

    const context = createMockContext({
      feature1: line1,
      feature2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersects).toBe(false);
  });

  it("returns true for intersecting polygons", async () => {
    const polygon1 = {
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
    const polygon2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [1, 1],
            [1, 3],
            [3, 3],
            [3, 1],
            [1, 1],
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
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns false for non-intersecting polygons", async () => {
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
            [3, 3],
            [3, 4],
            [4, 4],
            [4, 3],
            [3, 3],
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
    expect(result.outputs?.intersects).toBe(false);
  });

  it("returns true for point inside polygon", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1],
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
            [0, 2],
            [2, 2],
            [2, 0],
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
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns false for point outside polygon", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [5, 5],
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
            [0, 2],
            [2, 2],
            [2, 0],
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
    expect(result.outputs?.intersects).toBe(false);
  });

  it("returns true for line intersecting polygon", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 1],
          [3, 1],
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
            [1, 0],
            [1, 2],
            [2, 2],
            [2, 0],
            [1, 0],
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
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns false for line outside polygon", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [5, 5],
          [6, 6],
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
            [0, 2],
            [2, 2],
            [2, 0],
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
    expect(result.outputs?.intersects).toBe(false);
  });

  it("returns true for touching polygons", async () => {
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
            [1, 0],
            [1, 1],
            [2, 1],
            [2, 0],
            [1, 0],
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
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns true for overlapping polygons", async () => {
    const polygon1 = {
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
    const polygon2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [1, 1],
            [1, 3],
            [3, 3],
            [3, 1],
            [1, 1],
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
    expect(result.outputs?.intersects).toBe(true);
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
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns true for point on line", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1],
      },
    };
    const line = {
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
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns false for point not on line", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 2],
      },
    };
    const line = {
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
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersects).toBe(false);
  });

  it("returns true for intersecting multi polygons", async () => {
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
              [0.5, 0.5],
              [0.5, 1.5],
              [1.5, 1.5],
              [1.5, 0.5],
              [0.5, 0.5],
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
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns false for non-intersecting multi polygons", async () => {
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
              [5, 5],
              [5, 6],
              [6, 6],
              [6, 5],
              [5, 5],
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
    expect(result.outputs?.intersects).toBe(false);
  });

  it("returns true for geometry objects", async () => {
    const point = {
      type: "Point",
      coordinates: [1, 1],
    };
    const polygon = {
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
    };

    const context = createMockContext({
      feature1: point,
      feature2: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersects).toBe(true);
  });

  it("returns true for large coordinate values", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1000, 1000],
      },
    };
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [999, 999],
            [999, 1001],
            [1001, 1001],
            [1001, 999],
            [999, 999],
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
    expect(result.outputs?.intersects).toBe(true);
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
