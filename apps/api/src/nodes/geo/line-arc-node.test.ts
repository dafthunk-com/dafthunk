import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { LineArcNode } from "./line-arc-node";

describe("LineArcNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new LineArcNode({
    id: "test-node",
    name: "Test Node",
    type: "line-arc",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns LineString for basic arc with center point", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("returns LineString for arc with custom steps", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 2,
      bearing1: 45,
      bearing2: 135,
      steps: 32,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("returns LineString for arc with Point geometry input", async () => {
    const context = createMockContext({
      center: {
        type: "Point",
        coordinates: [1, 1],
      },
      radius: 1,
      bearing1: 0,
      bearing2: 180,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("returns LineString for full circle arc", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: 360,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("returns LineString for arc with negative bearings", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: -90,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("returns LineString for arc with large radius", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 100,
      bearing1: 0,
      bearing2: 45,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("returns an error for missing center input", async () => {
    const context = createMockContext({
      radius: 1,
      bearing1: 0,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing center input");
  });

  it("returns an error for missing radius input", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      bearing1: 0,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing radius input");
  });

  it("returns an error for non-number radius", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: "not a number",
      bearing1: 0,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Radius must be a number");
  });

  it("returns an error for missing bearing1 input", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing bearing1 input");
  });

  it("returns an error for non-number bearing1", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: "not a number",
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bearing1 must be a number");
  });

  it("returns an error for missing bearing2 input", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing bearing2 input");
  });

  it("returns an error for non-number bearing2", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: "not a number",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bearing2 must be a number");
  });

  it("returns an error for non-number steps", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: 90,
      steps: "not a number",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Steps must be a number");
  });

  it("returns an error for non-positive steps", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: 90,
      steps: 0,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Steps must be a positive number");
  });

  it("handles null steps gracefully", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: 90,
      steps: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });

  it("handles undefined steps gracefully", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 1,
      bearing1: 0,
      bearing2: 90,
      steps: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.arc).toBeDefined();
    expect(result.outputs?.arc.type).toBe("Feature");
    expect(result.outputs?.arc.geometry.type).toBe("LineString");
  });
});
