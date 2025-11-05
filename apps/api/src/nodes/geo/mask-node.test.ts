import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { MaskNode } from "./mask-node";

describe("MaskNode", () => {
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

  const node = new MaskNode({
    id: "test-node",
    name: "Test Node",
    type: "mask",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns Polygon for basic mask operation", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for Polygon geometry inputs", async () => {
    const context = createMockContext({
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [1, 1],
            [3, 1],
            [3, 3],
            [1, 3],
            [1, 1],
          ],
        ],
      },
      mask: {
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
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon without mask input", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with mutate option true", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
      mutate: true,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon with mutate option false", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
      mutate: false,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for MultiPolygon input", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [1, 1],
                [3, 1],
                [3, 3],
                [1, 3],
                [1, 1],
              ],
            ],
            [
              [
                [5, 5],
                [7, 5],
                [7, 7],
                [5, 7],
                [5, 5],
              ],
            ],
          ],
        },
      },
      mask: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [8, 0],
              [8, 8],
              [0, 8],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for simple coordinates", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [2, 2],
              [6, 2],
              [6, 6],
              [2, 6],
              [2, 2],
            ],
          ],
        },
      },
      mask: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [8, 0],
              [8, 8],
              [0, 8],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for small polygon", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns Polygon for polygon with hole", async () => {
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
      mask: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-1, -1],
              [5, -1],
              [5, 5],
              [-1, 5],
              [-1, -1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("handles null mask gracefully", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("handles undefined mask gracefully", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("handles null mutate gracefully", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
      mutate: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("handles undefined mutate gracefully", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
      mutate: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.masked).toBeDefined();
    expect(result.outputs?.masked.type).toBe("Feature");
    expect(result.outputs?.masked.geometry.type).toBe("Polygon");
  });

  it("returns an error for missing polygon input", async () => {
    const context = createMockContext({
      mask: {
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
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing polygon input");
  });

  it("returns an error for non-boolean mutate", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
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
      mask: {
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
      mutate: "not a boolean",
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Mutate must be a boolean");
  });
});
