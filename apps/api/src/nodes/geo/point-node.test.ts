import { NodeContext } from "@dafthunk/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { PointNode } from "./point-node";

describe("PointNode", () => {
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

  let node: PointNode;

  beforeEach(() => {
    node = new PointNode({
      id: "test-node",
      name: "Test Node",
      type: "point",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
  });

  describe("Basic point creation", () => {
    it("should create point with x and y coordinates", async () => {
      const context = createMockContext({
        x: 10,
        y: 20,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should create point with x, y, and z coordinates", async () => {
      const context = createMockContext({
        x: 10,
        y: 20,
        z: 30,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
      expect(result.outputs?.point.type).toBe("Feature");
      expect(result.outputs?.point.geometry.type).toBe("Point");
    });

    it("should create point at origin", async () => {
      const context = createMockContext({
        x: 0,
        y: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.point).toBeDefined();
    });
  });

  describe("Node definition", () => {
    it("should have correct node type definition", () => {
      expect(PointNode.nodeType.id).toBe("point");
      expect(PointNode.nodeType.name).toBe("Point");
      expect(PointNode.nodeType.type).toBe("point");
      expect(PointNode.nodeType.tags).toContain("Geo");
    });

    it("should have correct inputs", () => {
      const inputs = PointNode.nodeType.inputs;
      expect(inputs).toHaveLength(3);

      const xInput = inputs.find((i) => i.name === "x");
      expect(xInput).toBeDefined();
      expect(xInput?.type).toBe("number");
      expect(xInput?.required).toBe(true);

      const yInput = inputs.find((i) => i.name === "y");
      expect(yInput).toBeDefined();
      expect(yInput?.type).toBe("number");
      expect(yInput?.required).toBe(true);

      const zInput = inputs.find((i) => i.name === "z");
      expect(zInput).toBeDefined();
      expect(zInput?.type).toBe("number");
      expect(zInput?.required).toBe(false);
    });

    it("should have correct outputs", () => {
      const outputs = PointNode.nodeType.outputs;
      expect(outputs).toHaveLength(1);

      const pointOutput = outputs[0];
      expect(pointOutput.name).toBe("point");
      expect(pointOutput.type).toBe("geojson");
    });
  });
});
