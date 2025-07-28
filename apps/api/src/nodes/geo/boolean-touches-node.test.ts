import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanTouchesNode } from "./boolean-touches-node";

describe("BooleanTouchesNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new BooleanTouchesNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-touches",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for point touching line at start", async () => {
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
          [1, 1],
          [1, 2],
          [1, 3],
          [1, 4],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns true for point touching line at end", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 4],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 1],
          [1, 2],
          [1, 3],
          [1, 4],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns true for point touching line in middle", async () => {
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
          [1, 1],
          [1, 2],
          [1, 3],
          [1, 4],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns true for polygons touching at edge", async () => {
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns true for polygons touching at corner", async () => {
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
            [1, 1],
            [1, 2],
            [2, 2],
            [2, 1],
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns false for point not touching line", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 1],
          [1, 2],
          [1, 3],
          [1, 4],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(false);
  });

  it("returns false for point inside line", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1.5],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 1],
          [1, 2],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(false);
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns false for disjoint polygons", async () => {
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
    expect(result.outputs?.touches).toBe(false);
  });

  it("returns true for line touching polygon at edge", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0, 2],
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns false for line intersecting polygon", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0.5, 0],
          [0.5, 2],
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
    expect(result.outputs?.touches).toBe(false);
  });

  it("returns true for lines touching at endpoint", async () => {
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns false for lines crossing", async () => {
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
    expect(result.outputs?.touches).toBe(false);
  });

  it("returns true for identical points", async () => {
    const point1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1],
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns false for different points", async () => {
    const point1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1],
      },
    };
    const point2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2],
      },
    };

    const context = createMockContext({
      feature1: point1,
      feature2: point2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(false);
  });

  it("returns true for geometry objects", async () => {
    const point = {
      type: "Point",
      coordinates: [1, 1],
    };
    const line = {
      type: "LineString",
      coordinates: [
        [1, 1],
        [1, 2],
        [1, 3],
        [1, 4],
      ],
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns true for point touching polygon vertex", async () => {
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
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns false for point inside polygon", async () => {
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
    expect(result.outputs?.touches).toBe(false);
  });

  it("returns true for large coordinate geometries", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [100, 100],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [100, 100],
          [100, 200],
          [100, 300],
        ],
      },
    };

    const context = createMockContext({
      feature1: point,
      feature2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.touches).toBe(true);
  });

  it("returns an error for missing feature1 input", async () => {
    const context = createMockContext({
      feature2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [1, 1],
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
          coordinates: [1, 1],
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
          coordinates: [1, 1],
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
          coordinates: [1, 1],
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
          coordinates: [1, 1],
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
          coordinates: [1, 1],
        },
      },
      feature2: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing feature2 input");
  });
});
