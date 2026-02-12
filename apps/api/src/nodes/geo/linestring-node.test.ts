import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { LineStringNode } from "./linestring-node";

describe("LineStringNode", () => {
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

  const node = new LineStringNode({
    id: "test-node",
    name: "Test Node",
    type: "lineString",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Node definition", () => {
    it("should have correct node type definition", () => {
      expect(LineStringNode.nodeType.id).toBe("lineString");
      expect(LineStringNode.nodeType.name).toBe("LineString");
      expect(LineStringNode.nodeType.type).toBe("lineString");
      expect(LineStringNode.nodeType.tags).toContain("Geo");
    });

    it("should have correct inputs", () => {
      const inputs = LineStringNode.nodeType.inputs;
      expect(inputs).toHaveLength(2);

      const coordinatesInput = inputs.find((i) => i.name === "coordinates");
      expect(coordinatesInput).toBeDefined();
      expect(coordinatesInput?.type).toBe("json");
      expect(coordinatesInput?.required).toBe(true);

      const propertiesInput = inputs.find((i) => i.name === "properties");
      expect(propertiesInput).toBeDefined();
      expect(propertiesInput?.type).toBe("json");
      expect(propertiesInput?.required).toBe(false);
    });

    it("should have correct outputs", () => {
      const outputs = LineStringNode.nodeType.outputs;
      expect(outputs).toHaveLength(1);

      const lineStringOutput = outputs.find((o) => o.name === "lineString");
      expect(lineStringOutput).toBeDefined();
      expect(lineStringOutput?.type).toBe("geojson");
    });
  });

  describe("Error handling", () => {
    it("should handle missing coordinates", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Error creating LineString");
    });

    it("should handle invalid coordinates", async () => {
      const context = createMockContext({
        coordinates: "not an array",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Error creating LineString");
    });
  });
});
