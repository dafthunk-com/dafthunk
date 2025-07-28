import { describe, expect, it } from "vitest";
import { CenterMedianNode } from "./center-median-node";
import { NodeContext } from "../types";

describe("CenterMedianNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new CenterMedianNode({
    id: "test-node",
    name: "Test Node",
    type: "center-median",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns center for single point", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1]
      }
    };
    
    const context = createMockContext({
      features: point
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1]
      }
    });
  });

  it("returns center for single polygon", async () => {
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 2],
            [2, 2],
            [2, 0],
            [0, 0]
          ]
        ]
      }
    };
    
    const context = createMockContext({
      features: polygon
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center for single line string", async () => {
    const line = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2]
        ]
      }
    };
    
    const context = createMockContext({
      features: line
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center for feature collection of points", async () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [2, 2]
          }
        }
      ]
    };
    
    const context = createMockContext({
      features: featureCollection
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center for feature collection of polygons", async () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
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
                [0, 0]
              ]
            ]
          }
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [2, 2],
                [2, 3],
                [3, 3],
                [3, 2],
                [2, 2]
              ]
            ]
          }
        }
      ]
    };
    
    const context = createMockContext({
      features: featureCollection
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center for feature collection of mixed geometries", async () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [2, 0],
              [2, 2]
            ]
          }
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [4, 0],
                [4, 1],
                [5, 1],
                [5, 0],
                [4, 0]
              ]
            ]
          }
        }
      ]
    };
    
    const context = createMockContext({
      features: featureCollection
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [4, 0]
      }
    });
  });

  it("returns center for geometry object", async () => {
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 2],
          [2, 2],
          [2, 0],
          [0, 0]
        ]
      ]
    };
    
    const context = createMockContext({
      features: polygon
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center for large coordinates", async () => {
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100, 100],
            [100, 200],
            [200, 200],
            [200, 100],
            [100, 100]
          ]
        ]
      }
    };
    
    const context = createMockContext({
      features: polygon
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [200, 200]
      }
    });
  });

  it("returns center for complex polygon", async () => {
    const polygon = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 3],
            [3, 3],
            [3, 0],
            [0, 0]
          ],
          [
            [1, 1],
            [1, 2],
            [2, 2],
            [2, 1],
            [1, 1]
          ]
        ]
      }
    };
    
    const context = createMockContext({
      features: polygon
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center for multi polygon", async () => {
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
              [0, 0]
            ]
          ],
          [
            [
              [2, 2],
              [2, 3],
              [3, 3],
              [3, 2],
              [2, 2]
            ]
          ]
        ]
      }
    };
    
    const context = createMockContext({
      features: multiPolygon
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns center with options", async () => {
    const point = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1]
      }
    };
    
    const context = createMockContext({
      features: point,
      options: {
        weight: "weight"
      }
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1]
      }
    });
  });

  it("returns center for single point with properties", async () => {
    const point = {
      type: "Feature",
      properties: { name: "test" },
      geometry: {
        type: "Point",
        coordinates: [1, 1]
      }
    };
    
    const context = createMockContext({
      features: point
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [1, 1]
      }
    });
  });

  it("returns center for feature collection with properties", async () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "point1" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        {
          type: "Feature",
          properties: { name: "point2" },
          geometry: {
            type: "Point",
            coordinates: [2, 2]
          }
        }
      ]
    };
    
    const context = createMockContext({
      features: featureCollection
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.center).toEqual({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [2, 2]
      }
    });
  });

  it("returns an error for missing features input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing features input");
  });

  it("returns an error for null features input", async () => {
    const context = createMockContext({
      features: null
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing features input");
  });

  it("returns an error for undefined features input", async () => {
    const context = createMockContext({
      features: undefined
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing features input");
  });
}); 