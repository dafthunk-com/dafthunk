import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { PolygonToLineNode } from "./polygon-to-line-node";

describe("PolygonToLineNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new PolygonToLineNode({
    id: "test-node",
    name: "Test Node",
    type: "polygon-to-line",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns LineString for Polygon input", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
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
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("LineString");
  });

  it("returns MultiLineString for MultiPolygon input", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
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
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("MultiLineString");
  });

  it("returns LineString with custom properties", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
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
      },
      properties: {
        name: "Test Line",
        length: 4,
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("LineString");
    expect(result.outputs?.line.properties.name).toBe("Test Line");
    expect(result.outputs?.line.properties.length).toBe(4);
  });

  it("returns LineString for simple Polygon with integer coordinates", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("LineString");
  });

  it("returns LineString for Polygon geometry input", async () => {
    const context = createMockContext({
      polygon: {
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
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("LineString");
  });

  it("returns LineString for Polygon with hole", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [3, 0],
              [3, 3],
              [0, 3],
              [0, 0],
            ],
            [
              [1, 1],
              [2, 1],
              [2, 2],
              [1, 2],
              [1, 1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("MultiLineString");
  });

  it("returns an error for missing polygon input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon input");
  });

  it("returns an error for non-object properties", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
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
      },
      properties: "not an object",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Properties must be an object");
  });

  it("handles null properties gracefully", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
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
      },
      properties: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("LineString");
  });

  it("handles undefined properties gracefully", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
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
      },
      properties: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.line).toBeDefined();
    expect(result.outputs?.line.type).toBe("Feature");
    expect(result.outputs?.line.geometry.type).toBe("LineString");
  });
});
