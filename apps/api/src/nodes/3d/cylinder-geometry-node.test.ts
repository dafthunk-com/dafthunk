import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CylinderGeometryNode } from "./cylinder-geometry-node";

describe("CylinderGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default cylinder geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cylinder-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CylinderGeometryNode(mockNode);
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
            radiusTop: 1,
            radiusBottom: 1,
            height: 1,
            diameterTop: 2,
            diameterBottom: 2,
          },
          segments: {
            radialSegments: 8,
            heightSegments: 1,
          },
        });
      }
    });

    it("should create a cylinder with custom dimensions", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cylinder-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CylinderGeometryNode(mockNode);
      const context = createMockContext({
        radiusTop: 2,
        radiusBottom: 1,
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
            radiusTop: 2,
            radiusBottom: 1,
            height: 3,
            diameterTop: 4,
            diameterBottom: 2,
          },
          segments: {
            radialSegments: 8,
            heightSegments: 1,
          },
        });
      }
    });

    it("should create a cylinder with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "cylinder-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CylinderGeometryNode(mockNode);
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
        type: "cylinder-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CylinderGeometryNode(mockNode);
      const context = createMockContext({
        radiusTop: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create cylinder geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = CylinderGeometryNode.nodeType;

      expect(nodeType.id).toBe("cylinder-geometry");
      expect(nodeType.name).toBe("Cylinder Geometry");
      expect(nodeType.type).toBe("cylinder-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("circle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(5);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radiusTop",
        "radiusBottom",
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
