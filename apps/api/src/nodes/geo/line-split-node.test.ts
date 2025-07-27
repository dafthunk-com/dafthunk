import { describe, expect, it } from "vitest";
import { LineSplitNode } from "./line-split-node";
import { NodeContext } from "../types";

describe("LineSplitNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LineSplitNode({
    id: "test-node",
    name: "Test Node",
    type: "line-split",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for basic line split", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[2, -1], [2, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry inputs", async () => {
    const context = createMockContext({
      line: {
        type: "LineString",
        coordinates: [[0, 0], [4, 0]]
      },
      splitter: {
        type: "LineString",
        coordinates: [[2, -1], [2, 1]]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Point splitter", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 0]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon splitter", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[1, -1], [3, -1], [3, 1], [1, 1], [1, -1]]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for diagonal line split", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 4]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[2, 0], [2, 4]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple coordinates", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [8, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[4, -2], [4, 2]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for non-intersecting splitter", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[4, 0], [6, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for touching splitter", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[2, 0], [4, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for short line", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0.5, -1], [0.5, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for multiple intersection points", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0], [4, 0], [6, 0]]
        }
      },
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[1, -1], [1, 1], [3, 1], [3, -1], [5, -1], [5, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.split).toBeDefined();
    expect(result.outputs?.split.type).toBe("FeatureCollection");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({
      splitter: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[2, -1], [2, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for missing splitter input", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing splitter input");
  });
}); 