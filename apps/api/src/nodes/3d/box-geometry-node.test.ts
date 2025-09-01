import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BoxGeometryNode } from "./box-geometry-node";

describe("BoxGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default box geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "box-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new BoxGeometryNode(mockNode);
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.bufferGeometry.mimeType).toBe(
          "application/x-buffer-geometry"
        );
        expect(result.outputs.bufferGeometry.data).toBeInstanceOf(Uint8Array);
        expect(result.outputs.metadata).toEqual({
          vertexCount: 24, // 8 vertices * 3 components
          triangleCount: 12, // 6 faces * 2 triangles each
          dimensions: {
            width: 1,
            height: 1,
            depth: 1,
          },
          segments: {
            width: 1,
            height: 1,
            depth: 1,
          },
        });
      }
    });

    it("should create a box with custom dimensions", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "box-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new BoxGeometryNode(mockNode);
      const context = createMockContext({
        width: 2,
        height: 3,
        depth: 4,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 24,
          triangleCount: 12,
          dimensions: {
            width: 2,
            height: 3,
            depth: 4,
          },
          segments: {
            width: 1,
            height: 1,
            depth: 1,
          },
        });
      }
    });

    it("should create a box with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "box-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new BoxGeometryNode(mockNode);
      const context = createMockContext({
        widthSegments: 2,
        heightSegments: 2,
        depthSegments: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          width: 2,
          height: 2,
          depth: 2,
        });
        // With 2 segments on each axis, we get more vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(24);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(12);
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "box-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new BoxGeometryNode(mockNode);
      const context = createMockContext({
        width: -1, // Invalid negative width
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create box geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = BoxGeometryNode.nodeType;

      expect(nodeType.id).toBe("box-geometry");
      expect(nodeType.name).toBe("Box Geometry");
      expect(nodeType.type).toBe("box-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("cube");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(6);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "width",
        "height",
        "depth",
        "widthSegments",
        "heightSegments",
        "depthSegments",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
