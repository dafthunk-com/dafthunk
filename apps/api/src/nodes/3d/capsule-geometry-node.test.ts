import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CapsuleGeometryNode } from "./capsule-geometry-node";

describe("CapsuleGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default capsule geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "capsule-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CapsuleGeometryNode(mockNode);
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
            length: 1,
            diameter: 2,
            totalLength: 3,
          },
          segments: {
            capSegments: 4,
            radialSegments: 8,
          },
        });
      }
    });

    it("should create a capsule with custom dimensions", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "capsule-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CapsuleGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
        length: 3,
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
            length: 3,
            diameter: 4,
            totalLength: 7,
          },
          segments: {
            capSegments: 4,
            radialSegments: 8,
          },
        });
      }
    });

    it("should create a capsule with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "capsule-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CapsuleGeometryNode(mockNode);
      const context = createMockContext({
        capSegments: 6,
        radialSegments: 12,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          capSegments: 6,
          radialSegments: 12,
        });
        // With more segments, we get more vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(0);
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "capsule-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CapsuleGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create capsule geometry");
      }
    });

    it("should handle invalid radial segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "capsule-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CapsuleGeometryNode(mockNode);
      const context = createMockContext({
        radialSegments: 2, // Invalid: must be at least 3
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create capsule geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = CapsuleGeometryNode.nodeType;

      expect(nodeType.id).toBe("capsule-geometry");
      expect(nodeType.name).toBe("Capsule Geometry");
      expect(nodeType.type).toBe("capsule-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("circle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(4);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radius",
        "length",
        "capSegments",
        "radialSegments",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
