import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanConcaveNode } from "./boolean-concave-node";

describe("BooleanConcaveNode", () => {
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

  const node = new BooleanConcaveNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-concave",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns false for convex polygon (square)", async () => {
    const context = createMockContext({
      polygon: {
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
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns false for convex polygon (rectangle)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 2],
              [3, 2],
              [3, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns false for convex polygon (triangle)", async () => {
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
              [1, 2],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns true for concave polygon (star shape)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 2],
              [0, 4],
              [2, 6],
              [0, 8],
              [-2, 6],
              [0, 4],
              [-2, 2],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
  });

  it("returns true for concave polygon (L shape)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 3],
              [1, 3],
              [1, 1],
              [3, 1],
              [3, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
  });

  it("returns true for concave polygon (C shape)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 4],
              [1, 4],
              [1, 1],
              [3, 1],
              [3, 4],
              [4, 4],
              [4, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
  });

  it("returns false for convex polygon (hexagon)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 2],
              [1, 0],
              [3, 0],
              [4, 2],
              [3, 4],
              [1, 4],
              [0, 2],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns true for concave polygon (diamond with indentation)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 2],
              [1, 0],
              [2, 1],
              [3, 0],
              [4, 2],
              [3, 4],
              [2, 3],
              [1, 4],
              [0, 2],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
  });

  it("returns false for convex polygon (pentagon)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 2],
              [1, 0],
              [3, 0],
              [4, 2],
              [2, 4],
              [0, 2],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns true for concave polygon (cross shape)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 0],
              [2, 0],
              [2, 1],
              [3, 1],
              [3, 2],
              [2, 2],
              [2, 3],
              [1, 3],
              [1, 2],
              [0, 2],
              [0, 1],
              [1, 1],
              [1, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
  });

  it("returns false for convex polygon (octagon)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 2],
              [1, 1],
              [2, 0],
              [4, 0],
              [5, 1],
              [6, 2],
              [5, 3],
              [4, 4],
              [2, 4],
              [1, 3],
              [0, 2],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns true for concave polygon (arrow shape)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 1],
              [2, 0],
              [2, 1],
              [4, 1],
              [4, 2],
              [2, 2],
              [2, 3],
              [0, 1],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
  });

  it("returns false for convex polygon (large rectangle)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 10],
              [20, 10],
              [20, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(false);
  });

  it("returns true for concave polygon (complex shape)", async () => {
    const context = createMockContext({
      polygon: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 5],
              [2, 5],
              [2, 3],
              [4, 3],
              [4, 5],
              [6, 5],
              [6, 0],
              [4, 0],
              [4, 2],
              [2, 2],
              [2, 0],
              [0, 0],
            ],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isConcave).toBe(true);
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
