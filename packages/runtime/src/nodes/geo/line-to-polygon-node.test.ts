import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { LineToPolygonNode } from "./line-to-polygon-node";

describe("LineToPolygonNode", () => {
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

  const node = new LineToPolygonNode({
    id: "test-node",
    name: "Test Node",
    type: "line-to-polygon",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns Polygon for LineString input", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
  });

  it("returns MultiPolygon for MultiLineString input", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("MultiPolygon");
  });

  it("returns Polygon with custom properties", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
      },
      properties: {
        name: "Test Polygon",
        area: 1,
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
    expect(result.outputs?.polygon.properties.name).toBe("Test Polygon");
    expect(result.outputs?.polygon.properties.area).toBe(1);
  });

  it("returns Polygon for simple LineString with integer coordinates", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for LineString geometry input", async () => {
    const context = createMockContext({
      line: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for non-object properties", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
      },
      properties: "not an object",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Properties must be an object");
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
      },
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        },
      },
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.polygon).toBeDefined();
    expect(result.outputs?.polygon.type).toBe("Feature");
    expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
  });
});
