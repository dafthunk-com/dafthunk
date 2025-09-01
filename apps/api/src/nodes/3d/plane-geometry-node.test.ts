import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { PlaneGeometryNode } from "./plane-geometry-node";

describe("PlaneGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default plane geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "plane-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new PlaneGeometryNode(mockNode);
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
          vertexCount: 4, // 4 vertices for basic plane (2x2 grid)
          triangleCount: 2, // 2 triangles for basic plane
          dimensions: {
            width: 1,
            height: 1,
          },
          segments: {
            width: 1,
            height: 1,
          },
        });
      }
    });

    it("should create a plane with custom dimensions", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "plane-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new PlaneGeometryNode(mockNode);
      const context = createMockContext({
        width: 2,
        height: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 4,
          triangleCount: 2,
          dimensions: {
            width: 2,
            height: 3,
          },
          segments: {
            width: 1,
            height: 1,
          },
        });
      }
    });

    it("should create a plane with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "plane-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new PlaneGeometryNode(mockNode);
      const context = createMockContext({
        widthSegments: 2,
        heightSegments: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          width: 2,
          height: 2,
        });
        // With 2 segments on each axis, we get more vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(4);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(2);
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "plane-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new PlaneGeometryNode(mockNode);
      const context = createMockContext({
        width: -1, // Invalid negative width
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create plane geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = PlaneGeometryNode.nodeType;

      expect(nodeType.id).toBe("plane-geometry");
      expect(nodeType.name).toBe("Plane Geometry");
      expect(nodeType.type).toBe("plane-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("square");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(4);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "width",
        "height",
        "widthSegments",
        "heightSegments",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
