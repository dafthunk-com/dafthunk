import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { RewindNode } from "./rewind-node";

describe("RewindNode", () => {
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

  const node = new RewindNode({
    id: "test-node",
    name: "Test Node",
    type: "rewind",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return rewound geometry when given valid polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Feature",
          properties: { name: "Test Polygon" },
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
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Feature");
      expect(result.outputs?.rewound.geometry.type).toBe("Polygon");
    });

    it("should work with simple polygon geometry", async () => {
      const context = createMockContext({
        geojson: {
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
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should work with LineString geometry", async () => {
      const context = createMockContext({
        geojson: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 0],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("LineString");
    });

    it("should work with MultiPolygon geometry", async () => {
      const context = createMockContext({
        geojson: {
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
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("MultiPolygon");
    });

    it("should work with MultiLineString geometry", async () => {
      const context = createMockContext({
        geojson: {
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
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("MultiLineString");
    });

    it("should work with integer coordinates", async () => {
      const context = createMockContext({
        geojson: {
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
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should work with reverse option set to true", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should work with reverse option set to false", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: false,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should work with mutate option set to true", async () => {
      const context = createMockContext({
        geojson: {
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
        mutate: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should work with both reverse and mutate options", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: true,
        mutate: false,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });
  });

  describe("Input validation", () => {
    it("should handle missing geojson input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle null geojson input", async () => {
      const context = createMockContext({
        geojson: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle undefined geojson input", async () => {
      const context = createMockContext({
        geojson: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing geojson input");
    });

    it("should handle invalid reverse type", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Reverse must be a boolean");
    });

    it("should handle reverse as number", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Reverse must be a boolean");
    });

    it("should handle invalid mutate type", async () => {
      const context = createMockContext({
        geojson: {
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
        mutate: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });

    it("should handle mutate as number", async () => {
      const context = createMockContext({
        geojson: {
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
        mutate: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mutate must be a boolean");
    });
  });

  describe("Edge cases", () => {
    it("should handle null reverse option", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should handle undefined reverse option", async () => {
      const context = createMockContext({
        geojson: {
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
        reverse: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should handle null mutate option", async () => {
      const context = createMockContext({
        geojson: {
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
        mutate: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should handle undefined mutate option", async () => {
      const context = createMockContext({
        geojson: {
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
        mutate: undefined,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should handle polygon with hole", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
            [
              [2, 2],
              [8, 2],
              [8, 8],
              [2, 8],
              [2, 2],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should handle large coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [1000, 1000],
              [2000, 1000],
              [2000, 2000],
              [1000, 2000],
              [1000, 1000],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });

    it("should handle negative coordinates", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [-10, -10],
              [10, -10],
              [10, 10],
              [-10, 10],
              [-10, -10],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.rewound).toBeDefined();
      expect(result.outputs?.rewound.type).toBe("Polygon");
    });
  });
});
