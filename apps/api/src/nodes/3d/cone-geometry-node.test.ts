import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { ConeGeometryNode } from "./cone-geometry-node";

describe("ConeGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default cone geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cone-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ConeGeometryNode(mockNode);
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
          vertexCount: expect.any(Number),
          triangleCount: expect.any(Number),
          dimensions: {
            radius: 1,
            height: 1,
            diameter: 2,
          },
          segments: {
            radialSegments: 8,
            heightSegments: 1,
          },
        });
      }
    });

    it("should create a cone with custom dimensions", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cone-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ConeGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
        height: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: expect.any(Number),
          triangleCount: expect.any(Number),
          dimensions: {
            radius: 2,
            height: 3,
            diameter: 4,
          },
          segments: {
            radialSegments: 8,
            heightSegments: 1,
          },
        });
      }
    });

    it("should create a cone with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cone-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ConeGeometryNode(mockNode);
      const context = createMockContext({
        radialSegments: 16,
        heightSegments: 4,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          radialSegments: 16,
          heightSegments: 4,
        });
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(0);
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cone-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ConeGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create cone geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = ConeGeometryNode.nodeType;

      expect(nodeType.id).toBe("cone-geometry");
      expect(nodeType.name).toBe("Cone Geometry");
      expect(nodeType.type).toBe("cone-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("triangle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(4);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radius",
        "height",
        "radialSegments",
        "heightSegments",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
