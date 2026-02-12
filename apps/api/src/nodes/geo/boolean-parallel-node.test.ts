import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { BooleanParallelNode } from "./boolean-parallel-node";

describe("BooleanParallelNode", () => {
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

  const node = new BooleanParallelNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-parallel",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for parallel vertical lines", async () => {
    const line1 = {
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
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 0],
          [1, 1],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns true for parallel horizontal lines", async () => {
    const line1 = {
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
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 1],
          [1, 1],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns true for parallel diagonal lines", async () => {
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
          [0, 1],
          [1, 2],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns false for perpendicular lines", async () => {
    const line1 = {
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
    const line2 = {
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
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(false);
  });

  it("returns false for intersecting lines", async () => {
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
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(false);
  });

  it("returns true for parallel lines with different slopes", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 1],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 1],
          [2, 2],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns false for lines with different slopes", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 1],
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
          [1, 2],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(false);
  });

  it("returns true for parallel multi-segment lines", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns false for multi-segment lines with different directions", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
          [2, 0],
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
          [0, 1],
          [0, 2],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(false);
  });

  it("returns true for parallel lines with large coordinates", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [100, 0],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 50],
          [100, 50],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns true for parallel diagonal lines with large coordinates", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [100, 100],
        ],
      },
    };
    const line2 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 50],
          [100, 150],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns false for lines with opposite slopes", async () => {
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
          [0, 1],
          [1, 0],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(false);
  });

  it("returns true for geometry objects", async () => {
    const line1 = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [0, 1],
      ],
    };
    const line2 = {
      type: "LineString",
      coordinates: [
        [1, 0],
        [1, 1],
      ],
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns true for identical lines", async () => {
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
      line1: line,
      line2: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns true for parallel lines with different lengths", async () => {
    const line1 = {
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
    const line2 = {
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

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(true);
  });

  it("returns false for lines with slight angle differences", async () => {
    const line1 = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 1],
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
          [2, 1.1],
        ],
      },
    };

    const context = createMockContext({
      line1: line1,
      line2: line2,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isParallel).toBe(false);
  });

  it("returns an error for missing line1 input", async () => {
    const context = createMockContext({
      line2: {
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
    expect(result.error).toBe("Missing line1 input");
  });

  it("returns an error for missing line2 input", async () => {
    const context = createMockContext({
      line1: {
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
    expect(result.error).toBe("Missing line2 input");
  });

  it("returns an error for null line1 input", async () => {
    const context = createMockContext({
      line1: null,
      line2: {
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
    expect(result.error).toBe("Missing line1 input");
  });

  it("returns an error for null line2 input", async () => {
    const context = createMockContext({
      line1: {
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
      line2: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line2 input");
  });

  it("returns an error for undefined line1 input", async () => {
    const context = createMockContext({
      line1: undefined,
      line2: {
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
    expect(result.error).toBe("Missing line1 input");
  });

  it("returns an error for undefined line2 input", async () => {
    const context = createMockContext({
      line1: {
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
      line2: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line2 input");
  });
});
