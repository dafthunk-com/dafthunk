import { describe, expect, it } from "vitest";
import { FeatureCollectionNode } from "./feature-collection-node";
import { NodeContext } from "../types";

describe("FeatureCollectionNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new FeatureCollectionNode({
    id: "test-node",
    name: "Test Node",
    type: "feature-collection",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for basic feature collection creation", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toBeDefined();
  });

  it("returns FeatureCollection for multiple features", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        {
          type: "Feature",
          properties: { name: "Point B" },
          geometry: {
            type: "Point",
            coordinates: [1, 1]
          }
        },
        {
          type: "Feature",
          properties: { name: "Point C" },
          geometry: {
            type: "Point",
            coordinates: [2, 2]
          }
        }
      ]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toBeDefined();
    expect(result.outputs?.featureCollection.features.length).toBe(3);
  });

  it("returns FeatureCollection for mixed geometry types", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        {
          type: "Feature",
          properties: { name: "Line" },
          geometry: {
            type: "LineString",
            coordinates: [[0, 0], [1, 1], [2, 2]]
          }
        },
        {
          type: "Feature",
          properties: { name: "Polygon" },
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
          }
        }
      ]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toBeDefined();
    expect(result.outputs?.featureCollection.features.length).toBe(3);
  });

  it("returns FeatureCollection with bbox", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: [0, 0, 1, 1]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.bbox).toBeDefined();
  });

  it("returns FeatureCollection with string ID", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      id: "test-collection-1"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.id).toBe("test-collection-1");
  });

  it("returns FeatureCollection with number ID", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      id: 123
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.id).toBe(123);
  });

  it("returns FeatureCollection with bbox and ID", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: [0, 0, 1, 1],
      id: "test-collection"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.bbox).toBeDefined();
    expect(result.outputs?.featureCollection.id).toBe("test-collection");
  });

  it("returns FeatureCollection for single feature", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Single Point" },
          geometry: {
            type: "Point",
            coordinates: [5, 5]
          }
        }
      ]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features.length).toBe(1);
  });

  it("returns FeatureCollection for features with properties", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A", color: "red", value: 10 },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        {
          type: "Feature",
          properties: { name: "Point B", color: "blue", value: 20 },
          geometry: {
            type: "Point",
            coordinates: [1, 1]
          }
        }
      ]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features.length).toBe(2);
  });

  it("handles null bbox gracefully", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: null
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
  });

  it("handles undefined bbox gracefully", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: undefined
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
  });

  it("handles null ID gracefully", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      id: null
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
  });

  it("handles undefined ID gracefully", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      id: undefined
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
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

  it("returns an error for non-array bbox", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: "not an array"
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bbox must be an array");
  });

  it("returns an error for bbox with wrong length", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: [0, 0, 1]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bbox must be an array of 4 numbers [west, south, east, north]");
  });

  it("returns an error for bbox with non-number values", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      bbox: [0, 0, 1, "north"]
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("All bbox values must be numbers");
  });

  it("returns an error for non-string/non-number ID", async () => {
    const context = createMockContext({
      features: [
        {
          type: "Feature",
          properties: { name: "Point A" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        }
      ],
      id: true
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("ID must be a string or number");
  });
}); 