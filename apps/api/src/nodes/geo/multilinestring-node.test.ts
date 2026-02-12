import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { MultiLineStringNode } from "./multilinestring-node";

describe("MultiLineStringNode", () => {
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

  const node = new MultiLineStringNode({
    id: "test-node",
    name: "Test Node",
    type: "multi-line-string",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns MultiLineString for basic multi line string creation", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.geometry.type).toBe(
      "MultiLineString"
    );
    expect(result.outputs?.multiLineString.geometry.coordinates).toBeDefined();
  });

  it("returns MultiLineString for multiple line strings", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
        [
          [3, 3],
          [4, 4],
          [5, 5],
        ],
        [
          [6, 6],
          [7, 7],
          [8, 8],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.geometry.type).toBe(
      "MultiLineString"
    );
    expect(result.outputs?.multiLineString.geometry.coordinates).toBeDefined();
    expect(result.outputs?.multiLineString.geometry.coordinates.length).toBe(3);
  });

  it("returns MultiLineString with properties", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      properties: {
        name: "Test MultiLineString",
        color: "blue",
        value: 15,
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.properties).toBeDefined();
    expect(result.outputs?.multiLineString.properties.name).toBe(
      "Test MultiLineString"
    );
    expect(result.outputs?.multiLineString.properties.color).toBe("blue");
    expect(result.outputs?.multiLineString.properties.value).toBe(15);
  });

  it("returns MultiLineString with bbox", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      bbox: [0, 0, 2, 2],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.bbox).toBeDefined();
  });

  it("returns MultiLineString with string ID", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      id: "test-multilinestring-1",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.id).toBe("test-multilinestring-1");
  });

  it("returns MultiLineString with number ID", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      id: 456,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.id).toBe(456);
  });

  it("returns MultiLineString with properties, bbox, and ID", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      properties: { name: "Test" },
      bbox: [0, 0, 2, 2],
      id: "test-multilinestring",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.properties.name).toBe("Test");
    expect(result.outputs?.multiLineString.bbox).toBeDefined();
    expect(result.outputs?.multiLineString.id).toBe("test-multilinestring");
  });

  it("returns MultiLineString for single line string", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [5, 5],
          [6, 6],
          [7, 7],
        ],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.geometry.coordinates.length).toBe(1);
  });

  it("returns MultiLineString for line strings with different lengths", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
        [
          [2, 2],
          [3, 3],
          [4, 4],
          [5, 5],
        ],
        [[6, 6]],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
    expect(result.outputs?.multiLineString.geometry.type).toBe(
      "MultiLineString"
    );
    expect(result.outputs?.multiLineString.geometry.coordinates.length).toBe(3);
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
  });

  it("handles null bbox gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      bbox: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
  });

  it("handles undefined bbox gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      bbox: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
  });

  it("handles null ID gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      id: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
  });

  it("handles undefined ID gracefully", async () => {
    const context = createMockContext({
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      id: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.multiLineString).toBeDefined();
    expect(result.outputs?.multiLineString.type).toBe("Feature");
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
          [0, 0],
          [1, 1],
          [2, 2],
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
          [0, 0],
          [1, 1],
          [2, 2],
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
          [0, 0],
          [1, 1],
          [2, 2],
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
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      ],
      id: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("ID must be a string or number");
  });
});
