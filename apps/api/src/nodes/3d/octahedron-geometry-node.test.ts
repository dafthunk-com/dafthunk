import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { OctahedronGeometryNode } from "./octahedron-geometry-node";

describe("OctahedronGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default octahedron geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "octahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new OctahedronGeometryNode(mockNode);
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
          vertexCount: 24, // 24 vertices for Three.js octahedron
          triangleCount: 8, // 8 faces for basic octahedron
          dimensions: {
            radius: 1,
            diameter: 2,
          },
          detail: {
            level: 0,
            faces: 8,
          },
        });
      }
    });

    it("should create an octahedron with custom radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "octahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new OctahedronGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 24,
          triangleCount: 8,
          dimensions: {
            radius: 2,
            diameter: 4,
          },
          detail: {
            level: 0,
            faces: 8,
          },
        });
      }
    });

    it("should create an octahedron with custom detail level", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "octahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new OctahedronGeometryNode(mockNode);
      const context = createMockContext({
        detail: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.detail).toEqual({
          level: 1,
          faces: 32, // 8 * 4^1 = 32
        });
        // With detail level 1, we get more vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(24);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(8);
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "octahedron-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new OctahedronGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create octahedron geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = OctahedronGeometryNode.nodeType;

      expect(nodeType.id).toBe("octahedron-geometry");
      expect(nodeType.name).toBe("Octahedron Geometry");
      expect(nodeType.type).toBe("octahedron-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("diamond");
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
