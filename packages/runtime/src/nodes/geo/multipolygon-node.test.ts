import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { MultiPolygonNode } from "./multipolygon-node";

describe("MultiPolygonNode", () => {
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

  const node = new MultiPolygonNode({
    id: "test-node",
    name: "Test Node",
    type: "multipolygon",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns MultiPolygon for basic multi polygon creation", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.geometry.type).toBe("MultiPolygon");
    expect(result.outputs?.multiPolygon.geometry.coordinates).toBeDefined();
  });

  it("returns MultiPolygon for multiple polygons", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.geometry.type).toBe("MultiPolygon");
    expect(result.outputs?.multiPolygon.geometry.coordinates).toBeDefined();
    expect(result.outputs?.multiPolygon.geometry.coordinates.length).toBe(2);
  });

  it("returns MultiPolygon with properties", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      properties: {
        name: "Test MultiPolygon",
        color: "blue",
        value: 42,
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.properties).toBeDefined();
    expect(result.outputs?.multiPolygon.properties.name).toBe(
      "Test MultiPolygon"
    );
    expect(result.outputs?.multiPolygon.properties.color).toBe("blue");
    expect(result.outputs?.multiPolygon.properties.value).toBe(42);
  });

  it("returns MultiPolygon with bbox", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      bbox: [0, 0, 1, 1],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.bbox).toBeDefined();
  });

  it("returns MultiPolygon with string ID", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      id: "test-multipolygon-1",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.id).toBe("test-multipolygon-1");
  });

  it("returns MultiPolygon with number ID", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      id: 456,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.id).toBe(456);
  });

  it("returns MultiPolygon with properties, bbox, and ID", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      properties: { name: "Test" },
      bbox: [0, 0, 1, 1],
      id: "test-multipolygon",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.properties.name).toBe("Test");
    expect(result.outputs?.multiPolygon.bbox).toBeDefined();
    expect(result.outputs?.multiPolygon.id).toBe("test-multipolygon");
  });

  it("returns MultiPolygon for single polygon", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [5, 5],
            [6, 5],
            [6, 6],
            [5, 6],
            [5, 5],
          ],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.geometry.coordinates.length).toBe(1);
  });

  it("returns MultiPolygon for polygons with different coordinates", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
        [
          [
            [20, 20],
            [30, 20],
            [30, 30],
            [20, 30],
            [20, 20],
          ],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.geometry.type).toBe("MultiPolygon");
    expect(result.outputs?.multiPolygon.geometry.coordinates.length).toBe(2);
  });

  it("returns MultiPolygon for polygon with holes", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [2, 2],
            [8, 2],
            [8, 8],
            [2, 8],
            [2, 2],
          ],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
    expect(result.outputs?.multiPolygon.geometry.type).toBe("MultiPolygon");
    expect(result.outputs?.multiPolygon.geometry.coordinates[0].length).toBe(2);
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
  });

  it("handles null bbox gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      bbox: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
  });

  it("handles undefined bbox gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      bbox: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
  });

  it("handles null ID gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      id: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
  });

  it("handles undefined ID gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      id: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiPolygon).toBeDefined();
    expect(result.outputs?.multiPolygon.type).toBe("Feature");
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
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
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
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
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
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
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
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
      id: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("ID must be a string or number");
  });
});
