import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { TetrahedronGeometryNode } from "./tetrahedron-geometry-node";

describe("TetrahedronGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default tetrahedron geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "tetrahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TetrahedronGeometryNode(mockNode);
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
          vertexCount: 12, // 12 vertices for Three.js tetrahedron
          triangleCount: 4, // 4 faces for basic tetrahedron
          dimensions: {
            radius: 1,
            diameter: 2,
          },
          detail: {
            level: 0,
            faces: 4,
          },
        });
      }
    });

    it("should create a tetrahedron with custom radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "tetrahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TetrahedronGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 12,
          triangleCount: 4,
          dimensions: {
            radius: 2,
            diameter: 4,
          },
          detail: {
            level: 0,
            faces: 4,
          },
        });
      }
    });

    it("should create a tetrahedron with custom detail level", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "tetrahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TetrahedronGeometryNode(mockNode);
      const context = createMockContext({
        detail: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.detail).toEqual({
          level: 1,
          faces: 16, // 4 * 4^1 = 16
        });
        // With detail level 1, we get more vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(12);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(4);
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "tetrahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TetrahedronGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create tetrahedron geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = TetrahedronGeometryNode.nodeType;

      expect(nodeType.id).toBe("tetrahedron-geometry");
      expect(nodeType.name).toBe("Tetrahedron Geometry");
      expect(nodeType.type).toBe("tetrahedron-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("triangle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(2);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual(["radius", "detail"]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
