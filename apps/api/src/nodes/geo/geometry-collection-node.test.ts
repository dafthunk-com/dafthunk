import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { GeometryCollectionNode } from "./geometry-collection-node";

describe("GeometryCollectionNode", () => {
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

  const node = new GeometryCollectionNode({
    id: "test-node",
    name: "Test Node",
    type: "geometry-collection",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns GeometryCollection for basic geometry collection creation", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.geometry.type).toBe(
      "GeometryCollection"
    );
    expect(
      result.outputs?.geometryCollection.geometry.geometries
    ).toBeDefined();
  });

  it("returns GeometryCollection for multiple geometries", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
        {
          type: "LineString",
          coordinates: [
            [1, 1],
            [2, 2],
          ],
        },
        {
          type: "Polygon",
          coordinates: [
            [
              [3, 3],
              [4, 3],
              [4, 4],
              [3, 4],
              [3, 3],
            ],
          ],
        },
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.geometry.type).toBe(
      "GeometryCollection"
    );
    expect(
      result.outputs?.geometryCollection.geometry.geometries
    ).toBeDefined();
    expect(result.outputs?.geometryCollection.geometry.geometries.length).toBe(
      3
    );
  });

  it("returns GeometryCollection with properties", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      properties: {
        name: "Test Collection",
        color: "red",
        value: 10,
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.properties).toBeDefined();
    expect(result.outputs?.geometryCollection.properties.name).toBe(
      "Test Collection"
    );
    expect(result.outputs?.geometryCollection.properties.color).toBe("red");
    expect(result.outputs?.geometryCollection.properties.value).toBe(10);
  });

  it("returns GeometryCollection with bbox", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      bbox: [0, 0, 1, 1],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.bbox).toBeDefined();
  });

  it("returns GeometryCollection with string ID", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      id: "test-collection-1",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.id).toBe("test-collection-1");
  });

  it("returns GeometryCollection with number ID", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      id: 123,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.id).toBe(123);
  });

  it("returns GeometryCollection with properties, bbox, and ID", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      properties: { name: "Test" },
      bbox: [0, 0, 1, 1],
      id: "test-collection",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.properties.name).toBe("Test");
    expect(result.outputs?.geometryCollection.bbox).toBeDefined();
    expect(result.outputs?.geometryCollection.id).toBe("test-collection");
  });

  it("returns GeometryCollection for single geometry", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [5, 5],
        },
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.geometry.geometries.length).toBe(
      1
    );
  });

  it("returns GeometryCollection for complex geometry types", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
        {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
            [
              [2, 2],
              [3, 3],
            ],
          ],
        },
        {
          type: "MultiPolygon",
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
        },
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
    expect(result.outputs?.geometryCollection.geometry.type).toBe(
      "GeometryCollection"
    );
    expect(result.outputs?.geometryCollection.geometry.geometries.length).toBe(
      3
    );
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
  });

  it("handles null bbox gracefully", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      bbox: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
  });

  it("handles undefined bbox gracefully", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      bbox: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
  });

  it("handles null ID gracefully", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      id: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
  });

  it("handles undefined ID gracefully", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      id: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.geometryCollection).toBeDefined();
    expect(result.outputs?.geometryCollection.type).toBe("Feature");
  });

  it("returns an error for missing geometries input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geometries input");
  });

  it("returns an error for null geometries input", async () => {
    const context = createMockContext({
      geometries: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geometries input");
  });

  it("returns an error for undefined geometries input", async () => {
    const context = createMockContext({
      geometries: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geometries input");
  });

  it("returns an error for non-array bbox", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      bbox: "not an array",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bbox must be an array");
  });

  it("returns an error for bbox with wrong length", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
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
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      bbox: [0, 0, 1, "north"],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("All bbox values must be numbers");
  });

  it("returns an error for non-string/non-number ID", async () => {
    const context = createMockContext({
      geometries: [
        {
          type: "Point",
          coordinates: [0, 0],
        },
      ],
      id: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("ID must be a string or number");
  });
});
