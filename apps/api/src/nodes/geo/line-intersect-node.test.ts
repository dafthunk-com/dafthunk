import { describe, expect, it } from "vitest";
import { LineIntersectNode } from "./line-intersect-node";
import { NodeContext } from "../types";

describe("LineIntersectNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LineIntersectNode({
    id: "test-node",
    name: "Test Node",
    type: "line-intersect",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for intersecting LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 2]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 2], [2, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for non-intersecting LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[2, 2], [3, 3]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString geometry inputs", async () => {
    const context = createMockContext({
      line1: {
        type: "LineString",
        coordinates: [[0, 0], [2, 2]]
      },
      line2: {
        type: "LineString",
        coordinates: [[0, 2], [2, 0]]
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for LineString and Polygon intersection", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 2]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for Polygon and Polygon intersection", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for simple LineStrings with integer coordinates", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [4, 4]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 4], [4, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for parallel LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 1], [2, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for collinear LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[1, 0], [3, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns FeatureCollection for touching LineStrings", async () => {
    const context = createMockContext({
      line1: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0]]
        }
      },
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[1, 0], [2, 0]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.intersections).toBeDefined();
    expect(result.outputs?.intersections.type).toBe("FeatureCollection");
  });

  it("returns an error for missing line1 input", async () => {
    const context = createMockContext({
      line2: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 1]]
        }
      }
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
          coordinates: [[0, 0], [1, 1]]
        }
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line2 input");
  });
}); 