import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { FeatureNode } from "./feature-node";

describe("FeatureNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new FeatureNode({
    id: "test-node",
    name: "Test Node",
    type: "feature",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns Feature for basic feature creation", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("Point");
  });

  it("returns Feature for Point geometry", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [2, 3],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("Point");
  });

  it("returns Feature for LineString geometry", async () => {
    const context = createMockContext({
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("LineString");
  });

  it("returns Feature for Polygon geometry", async () => {
    const context = createMockContext({
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("Polygon");
  });

  it("returns Feature with properties", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: { name: "test-point", color: "red" },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.properties).toBeDefined();
    expect(result.outputs?.feature.properties.name).toBe("test-point");
    expect(result.outputs?.feature.properties.color).toBe("red");
  });

  it("returns Feature with string ID", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      id: "test-feature-1",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.id).toBe("test-feature-1");
  });

  it("returns Feature with number ID", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      id: 123,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.id).toBe(123);
  });

  it("returns Feature with properties and ID", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: { name: "test-point" },
      id: "test-id",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.properties.name).toBe("test-point");
    expect(result.outputs?.feature.id).toBe("test-id");
  });

  it("returns Feature for MultiPoint geometry", async () => {
    const context = createMockContext({
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("MultiPoint");
  });

  it("returns Feature for MultiLineString geometry", async () => {
    const context = createMockContext({
      geometry: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("MultiLineString");
  });

  it("returns Feature for MultiPolygon geometry", async () => {
    const context = createMockContext({
      geometry: {
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
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("MultiPolygon");
  });

  it("returns Feature for GeometryCollection", async () => {
    const context = createMockContext({
      geometry: {
        type: "GeometryCollection",
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
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
    expect(result.outputs?.feature.geometry.type).toBe("GeometryCollection");
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
  });

  it("handles null ID gracefully", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      id: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
  });

  it("handles undefined ID gracefully", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      id: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.feature).toBeDefined();
    expect(result.outputs?.feature.type).toBe("Feature");
  });

  it("returns an error for missing geometry input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geometry input");
  });

  it("returns an error for null geometry input", async () => {
    const context = createMockContext({
      geometry: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geometry input");
  });

  it("returns an error for undefined geometry input", async () => {
    const context = createMockContext({
      geometry: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing geometry input");
  });

  it("returns an error for non-object properties", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: "not an object",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Properties must be an object");
  });

  it("returns an error for non-string/non-number ID", async () => {
    const context = createMockContext({
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      id: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("ID must be a string or number");
  });
});
