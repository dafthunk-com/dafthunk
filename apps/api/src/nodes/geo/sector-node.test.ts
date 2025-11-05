import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { SectorNode } from "./sector-node";

describe("SectorNode", () => {
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

  const node = new SectorNode({
    id: "test-node",
    name: "Test Node",
    type: "sector",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns Polygon for basic sector operation", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for Point geometry input", async () => {
    const context = createMockContext({
      center: {
        type: "Point",
        coordinates: [0, 0],
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with custom units", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: "miles",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with degrees units", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: "degrees",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with radians units", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: "radians",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with kilometers units", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: "kilometers",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with custom steps", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      steps: 32,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with custom properties", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      properties: { name: "test-sector", color: "red" },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for simple coordinates", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [2, 2],
        },
      },
      radius: 10,
      bearing1: 45,
      bearing2: 135,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for small sector", async () => {
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
      bearing2: 30,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for large sector", async () => {
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
      bearing2: 270,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for full circle sector", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 360,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("handles null units gracefully", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("handles undefined units gracefully", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
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
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      steps: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
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
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      steps: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.sector).toBeDefined();
    expect(result.outputs?.sector.type).toBe("Feature");
    expect(result.outputs?.sector.geometry.type).toBe("Polygon");
  });

  it("returns an error for missing center input", async () => {
    const context = createMockContext({
      radius: 5,
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
      radius: 5,
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing bearing1 input");
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
      radius: 5,
      bearing1: 0,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing bearing2 input");
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
      radius: 5,
      bearing1: "not a number",
      bearing2: 90,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bearing1 must be a number");
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
      radius: 5,
      bearing1: 0,
      bearing2: "not a number",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bearing2 must be a number");
  });

  it("returns an error for non-string units", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: 123,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Units must be a string");
  });

  it("returns an error for invalid units", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      units: "invalid",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Units must be one of: miles, kilometers, degrees, radians"
    );
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
      radius: 5,
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
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      steps: 0,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Steps must be a positive number");
  });

  it("returns an error for negative steps", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      steps: -1,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Steps must be a positive number");
  });

  it("returns an error for non-object properties", async () => {
    const context = createMockContext({
      center: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      radius: 5,
      bearing1: 0,
      bearing2: 90,
      properties: "not an object",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Properties must be an object");
  });
});
