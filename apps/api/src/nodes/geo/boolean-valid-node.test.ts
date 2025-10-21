import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanValidNode } from "./boolean-valid-node";

describe("BooleanValidNode", () => {
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

  const node = new BooleanValidNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-valid",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for valid point", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1],
      },
    };

    const context = createMockContext({
      feature: point,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid line string", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 1],
          [1, 2],
          [1, 3],
          [1, 4],
        ],
      },
    };

    const context = createMockContext({
      feature: line,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid polygon", async () => {
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature: polygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid multi point", async () => {
    const multiPoint = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [1, 1],
          [2, 2],
          [3, 3],
        ],
      },
    };

    const context = createMockContext({
      feature: multiPoint,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid multi line string", async () => {
    const multiLineString = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [1, 1],
            [1, 2],
          ],
          [
            [2, 1],
            [2, 2],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature: multiLineString,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid multi polygon", async () => {
    const multiPolygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [2, 3],
              [3, 3],
              [3, 2],
              [2, 2],
            ],
          ],
        ],
      },
    };

    const context = createMockContext({
      feature: multiPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid geometry collection", async () => {
    const geometryCollection = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "GeometryCollection",
        geometries: [
          {
            type: "Point",
            coordinates: [1, 1],
          },
          {
            type: "LineString",
            coordinates: [
              [1, 1],
              [1, 2],
            ],
          },
        ],
      },
    };

    const context = createMockContext({
      feature: geometryCollection,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns true for valid geometry object", async () => {
    const point = {
      type: "Point",
      coordinates: [1, 1],
    };

    const context = createMockContext({
      feature: point,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(true);
  });

  it("returns false for invalid object", async () => {
    const invalidObject = {
      foo: "bar",
    };

    const context = createMockContext({
      feature: invalidObject,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for object without type", async () => {
    const invalidObject = {
      coordinates: [1, 1],
    };

    const context = createMockContext({
      feature: invalidObject,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for invalid geometry type", async () => {
    const invalidGeometry = {
      type: "InvalidType",
      coordinates: [1, 1],
    };

    const context = createMockContext({
      feature: invalidGeometry,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for point with missing coordinates", async () => {
    const invalidPoint = {
      type: "Point",
    };

    const context = createMockContext({
      feature: invalidPoint,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for line string with insufficient points", async () => {
    const invalidLine = {
      type: "LineString",
      coordinates: [[1, 1]],
    };

    const context = createMockContext({
      feature: invalidLine,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for polygon with unclosed ring", async () => {
    const invalidPolygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ],
      ],
    };

    const context = createMockContext({
      feature: invalidPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for polygon with insufficient points", async () => {
    const invalidPolygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [0, 0],
        ],
      ],
    };

    const context = createMockContext({
      feature: invalidPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for multi point with empty array", async () => {
    const invalidMultiPoint = {
      type: "MultiPoint",
      coordinates: [],
    };

    const context = createMockContext({
      feature: invalidMultiPoint,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for multi line string with empty array", async () => {
    const invalidMultiLineString = {
      type: "MultiLineString",
      coordinates: [],
    };

    const context = createMockContext({
      feature: invalidMultiLineString,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for multi polygon with empty array", async () => {
    const invalidMultiPolygon = {
      type: "MultiPolygon",
      coordinates: [],
    };

    const context = createMockContext({
      feature: invalidMultiPolygon,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for geometry collection with empty geometries", async () => {
    const invalidGeometryCollection = {
      type: "GeometryCollection",
      geometries: [],
    };

    const context = createMockContext({
      feature: invalidGeometryCollection,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for null feature", async () => {
    const context = createMockContext({
      feature: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for undefined feature", async () => {
    const context = createMockContext({
      feature: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for empty string", async () => {
    const context = createMockContext({
      feature: "",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for number", async () => {
    const context = createMockContext({
      feature: 123,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for boolean", async () => {
    const context = createMockContext({
      feature: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });

  it("returns false for missing feature input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.valid).toBe(false);
  });
});
