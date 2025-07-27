import { describe, expect, it } from "vitest";
import { LineSliceAlongNode } from "./line-slice-along-node";
import { NodeContext } from "../types";

describe("LineSliceAlongNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LineSliceAlongNode({
    id: "test-node",
    name: "Test Node",
    type: "line-slice-along",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns LineString for basic line slice along", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for LineString geometry input", async () => {
    const context = createMockContext({
      line: {
        type: "LineString",
        coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
      },
      startDist: 1,
      stopDist: 3
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString with custom units", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: "miles"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString with degrees units", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: "degrees"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString with radians units", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: "radians"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString with kilometers units", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: "kilometers"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for simple coordinates", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [2, 0], [4, 0], [6, 0], [8, 0]]
        }
      },
      startDist: 2,
      stopDist: 6
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for start and stop at same distance", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 2,
      stopDist: 2
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for start at beginning and stop at end", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 0,
      stopDist: 4
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns LineString for short line", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0]]
        }
      },
      startDist: 0,
      stopDist: 1
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({
      startDist: 1,
      stopDist: 3
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for missing startDist input", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      stopDist: 3
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing startDist input");
  });

  it("returns an error for missing stopDist input", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing stopDist input");
  });

  it("returns an error for non-number startDist", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: "not a number",
      stopDist: 3
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("startDist must be a number");
  });

  it("returns an error for non-number stopDist", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: "not a number"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("stopDist must be a number");
  });

  it("returns an error for non-string units", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: 123
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Units must be a string");
  });

  it("returns an error for invalid units", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: "invalid"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Units must be one of: degrees, radians, miles, kilometers");
  });

  it("handles null units gracefully", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: null
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });

  it("handles undefined units gracefully", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]
        }
      },
      startDist: 1,
      stopDist: 3,
      units: undefined
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sliced).toBeDefined();
    expect(result.outputs?.sliced.type).toBe("Feature");
    expect(result.outputs?.sliced.geometry.type).toBe("LineString");
  });
}); 