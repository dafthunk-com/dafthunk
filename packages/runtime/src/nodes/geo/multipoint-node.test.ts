import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { MultiPointNode } from "./multipoint-node";

describe("MultiPointNode", () => {
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

  const node = new MultiPointNode({
    id: "test-node",
    name: "Test Node",
    type: "multipoint",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns MultiPoint for basic multi point creation", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.geometry.type).toBe("MultiPoint");
    expect(result.outputs?.multiPoint.geometry.coordinates).toBeDefined();
  });

  it("returns MultiPoint for multiple points", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.geometry.type).toBe("MultiPoint");
    expect(result.outputs?.multiPoint.geometry.coordinates).toBeDefined();
    expect(result.outputs?.multiPoint.geometry.coordinates.length).toBe(5);
  });

  it("returns MultiPoint with properties", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      properties: {
        name: "Test MultiPoint",
        color: "green",
        value: 25,
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.properties).toBeDefined();
    expect(result.outputs?.multiPoint.properties.name).toBe("Test MultiPoint");
    expect(result.outputs?.multiPoint.properties.color).toBe("green");
    expect(result.outputs?.multiPoint.properties.value).toBe(25);
  });

  it("returns MultiPoint with bbox", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      bbox: [0, 0, 2, 2],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.bbox).toBeDefined();
  });

  it("returns MultiPoint with string ID", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      id: "test-multipoint-1",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.id).toBe("test-multipoint-1");
  });

  it("returns MultiPoint with number ID", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      id: 789,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.id).toBe(789);
  });

  it("returns MultiPoint with properties, bbox, and ID", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      properties: { name: "Test" },
      bbox: [0, 0, 2, 2],
      id: "test-multipoint",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.properties.name).toBe("Test");
    expect(result.outputs?.multiPoint.bbox).toBeDefined();
    expect(result.outputs?.multiPoint.id).toBe("test-multipoint");
  });

  it("returns MultiPoint for single point", async () => {
    const context = createMockContext({
      coordinates: [[5, 5]],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.geometry.coordinates.length).toBe(1);
  });

  it("returns MultiPoint for points with different coordinates", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [10, 20],
        [100, 200],
        [1000, 2000],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
    expect(result.outputs?.multiPoint.geometry.type).toBe("MultiPoint");
    expect(result.outputs?.multiPoint.geometry.coordinates.length).toBe(4);
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
  });

  it("handles null bbox gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      bbox: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
  });

  it("handles undefined bbox gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      bbox: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
  });

  it("handles null ID gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      id: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
  });

  it("handles undefined ID gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      id: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPoint).toBeDefined();
    expect(result.outputs?.multiPoint.type).toBe("Feature");
  });

  it("returns an error for missing coordinates input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing coordinates input");
  });

  it("returns an error for null coordinates input", async () => {
    const context = createMockContext({
      coordinates: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing coordinates input");
  });

  it("returns an error for undefined coordinates input", async () => {
    const context = createMockContext({
      coordinates: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing coordinates input");
  });

  it("returns an error for non-array bbox", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      bbox: "not an array",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bbox must be an array");
  });

  it("returns an error for bbox with wrong length", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      bbox: [0, 0, 1],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Bbox must be an array of 4 numbers [west, south, east, north]"
    );
  });

  it("returns an error for bbox with non-number values", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      bbox: [0, 0, 1, "north"],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("All bbox values must be numbers");
  });

  it("returns an error for non-string/non-number ID", async () => {
    const context = createMockContext({
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      id: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("ID must be a string or number");
  });
});
