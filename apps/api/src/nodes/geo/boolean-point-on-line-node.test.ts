import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanPointOnLineNode } from "./boolean-point-on-line-node";

describe("BooleanPointOnLineNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new BooleanPointOnLineNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-point-on-line",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for point on horizontal line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-1, 0],
          [1, 0],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point on vertical line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, -1],
          [0, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point on diagonal line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-1, -1],
          [1, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point on multi-segment line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-1, -1],
          [0, 0],
          [1, 1],
          [1.5, 2.2],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns false for point not on line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 1],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-1, 0],
          [1, 0],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(false);
  });

  it("returns false for point far from line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [5, 5],
      },
    };
    const line = {
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

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(false);
  });

  it("returns true for point at line start", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const line = {
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

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point at line end", async () => {
    const pt = {
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
          [1, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns false for point at line start when ignoreEndVertices is true", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
    const line = {
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

    const context = createMockContext({
      pt: pt,
      line: line,
      ignoreEndVertices: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(false);
  });

  it("returns false for point at line end when ignoreEndVertices is true", async () => {
    const pt = {
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
          [1, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
      ignoreEndVertices: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(false);
  });

  it("returns true for point on line middle when ignoreEndVertices is true", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.5, 0.5],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0.5, 0.5],
          [1, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
      ignoreEndVertices: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point with epsilon tolerance", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.1, 0.1],
      },
    };
    const line = {
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

    const context = createMockContext({
      pt: pt,
      line: line,
      epsilon: 0.2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns false for point outside epsilon tolerance", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.5, 0.5],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
      epsilon: 0.1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(false);
  });

  it("returns true for point on complex line", async () => {
    const pt = {
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
          [1, 1],
          [2, 0],
          [3, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns false for point near but not on line", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.1, 0.2],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(false);
  });

  it("returns true for point on line with large coordinates", async () => {
    const pt = {
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
          [0, 0],
          [100, 100],
          [200, 200],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for geometry objects", async () => {
    const pt = {
      type: "Point",
      coordinates: [0, 0],
    };
    const line = {
      type: "LineString",
      coordinates: [
        [-1, 0],
        [1, 0],
      ],
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point on horizontal line segment", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0.5, 0],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns true for point on vertical line segment", async () => {
    const pt = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [0, 0.5],
      },
    };
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0, 1],
        ],
      },
    };

    const context = createMockContext({
      pt: pt,
      line: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isOnLine).toBe(true);
  });

  it("returns an error for missing pt input", async () => {
    const context = createMockContext({
      line: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing pt input");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({
      pt: {
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
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for null pt input", async () => {
    const context = createMockContext({
      pt: null,
      line: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing pt input");
  });

  it("returns an error for null line input", async () => {
    const context = createMockContext({
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      line: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for undefined pt input", async () => {
    const context = createMockContext({
      pt: undefined,
      line: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing pt input");
  });

  it("returns an error for undefined line input", async () => {
    const context = createMockContext({
      pt: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      line: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });
});
