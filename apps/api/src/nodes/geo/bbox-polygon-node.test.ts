import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { BboxPolygonNode } from "./bbox-polygon-node";

describe("BboxPolygonNode", () => {
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

  const node = new BboxPolygonNode({
    id: "test-node",
    name: "Test Node",
    type: "bboxPolygon",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Node definition", () => {
    it("should have correct node type definition", () => {
      expect(BboxPolygonNode.nodeType.id).toBe("bboxPolygon");
      expect(BboxPolygonNode.nodeType.name).toBe("Bbox Polygon");
      expect(BboxPolygonNode.nodeType.type).toBe("bboxPolygon");
      expect(BboxPolygonNode.nodeType.tags).toContain("Geo");
    });

    it("should have correct inputs", () => {
      const inputs = BboxPolygonNode.nodeType.inputs;
      expect(inputs).toHaveLength(3);

      const bboxInput = inputs.find((i) => i.name === "bbox");
      expect(bboxInput).toBeDefined();
      expect(bboxInput?.type).toBe("json");
      expect(bboxInput?.required).toBe(true);

      const propertiesInput = inputs.find((i) => i.name === "properties");
      expect(propertiesInput).toBeDefined();
      expect(propertiesInput?.type).toBe("json");
      expect(propertiesInput?.required).toBe(false);

      const idInput = inputs.find((i) => i.name === "id");
      expect(idInput).toBeDefined();
      expect(idInput?.type).toBe("string");
      expect(idInput?.required).toBe(false);
    });

    it("should have correct outputs", () => {
      const outputs = BboxPolygonNode.nodeType.outputs;
      expect(outputs).toHaveLength(1);

      const polygonOutput = outputs[0];
      expect(polygonOutput.name).toBe("polygon");
      expect(polygonOutput.type).toBe("geojson");
    });
  });

  describe("Input validation", () => {
    it("should handle missing bbox input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bbox input");
    });

    it("should handle non-array bbox input", async () => {
      const context = createMockContext({
        bbox: "not an array",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must be an array with exactly 4 elements [minX, minY, maxX, maxY]"
      );
    });

    it("should handle bbox array with wrong length", async () => {
      const context = createMockContext({
        bbox: [0, 0, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must be an array with exactly 4 elements [minX, minY, maxX, maxY]"
      );
    });

    it("should handle bbox array with non-numeric values", async () => {
      const context = createMockContext({
        bbox: [0, "not a number", 1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox coordinate at index 1 must be a valid number"
      );
    });
  });

  describe("Successful execution", () => {
    it("should return polygon with correct structure", async () => {
      const context = createMockContext({
        bbox: [0, 0, 1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs).toBeDefined();
      expect(result.outputs?.polygon).toBeDefined();
      expect(result.outputs?.polygon.type).toBe("Feature");
      expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
    });

    it("should handle valid bbox with properties", async () => {
      const context = createMockContext({
        bbox: [0, 0, 1, 1],
        properties: { name: "test", color: "red" },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
      expect(result.outputs?.polygon.properties).toEqual({
        name: "test",
        color: "red",
      });
    });

    it("should handle valid bbox with string id", async () => {
      const context = createMockContext({
        bbox: [0, 0, 1, 1],
        id: "test-id",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
      expect(result.outputs?.polygon.id).toBe("test-id");
    });

    it("should handle valid bbox without optional parameters", async () => {
      const context = createMockContext({
        bbox: [0, 0, 1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
    });
  });

  describe("Different bbox values", () => {
    it("should handle simple integer coordinates", async () => {
      const context = createMockContext({
        bbox: [0, 0, 10, 10],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
    });

    it("should handle decimal coordinates", async () => {
      const context = createMockContext({
        bbox: [0.5, 0.5, 1.5, 1.5],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
    });
  });
});
