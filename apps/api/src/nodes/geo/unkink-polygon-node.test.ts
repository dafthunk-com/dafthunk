import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { UnkinkPolygonNode } from "./unkink-polygon-node";

describe("UnkinkPolygonNode", () => {
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

  const node = new UnkinkPolygonNode({
    id: "test-node",
    name: "Test Node",
    type: "unkink-polygon",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns FeatureCollection for basic unkink operation", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for Polygon geometry input", async () => {
    const context = createMockContext({
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0],
          ],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for MultiPolygon input", async () => {
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
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0],
              ],
            ],
            [
              [
                [3, 3],
                [5, 3],
                [5, 5],
                [3, 5],
                [3, 3],
              ],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for simple coordinates", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [5, 1],
              [5, 5],
              [1, 5],
              [1, 1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for small polygon", async () => {
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
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for large polygon", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for polygon with hole", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for complex polygon", async () => {
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
              [4, 2],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for polygon with properties", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: { name: "test-polygon", color: "blue" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns FeatureCollection for irregular polygon", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [3, 1],
              [2, 3],
              [1, 2],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.unkinked).toBeDefined();
    expect(result.outputs?.unkinked.type).toBe("FeatureCollection");
    expect(result.outputs?.unkinked.features).toBeDefined();
  });

  it("returns an error for missing polygon input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon input");
  });

  it("returns an error for null polygon input", async () => {
    const context = createMockContext({
      polygon: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon input");
  });

  it("returns an error for undefined polygon input", async () => {
    const context = createMockContext({
      polygon: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon input");
  });
});
