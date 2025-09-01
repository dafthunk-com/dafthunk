import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { RingGeometryNode } from "./ring-geometry-node";

describe("RingGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default ring geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "ring-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RingGeometryNode(mockNode);
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
          vertexCount: 66, // (32 + 1) * 2 vertices for default ring
          triangleCount: 64, // 32 * 2 triangles for default ring
          dimensions: {
            innerRadius: 0.5,
            outerRadius: 1,
            thickness: 0.5,
          },
          segments: {
            theta: 32,
            phi: 1,
          },
          angles: {
            start: 0,
            length: 2 * Math.PI,
            isFullCircle: true,
          },
        });
      }
    });

    it("should create a ring with custom radii", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "ring-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RingGeometryNode(mockNode);
      const context = createMockContext({
        innerRadius: 1,
        outerRadius: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 66,
          triangleCount: 64,
          dimensions: {
            innerRadius: 1,
            outerRadius: 3,
            thickness: 2,
          },
          segments: {
            theta: 32,
            phi: 1,
          },
          angles: {
            start: 0,
            length: 2 * Math.PI,
            isFullCircle: true,
          },
        });
      }
    });

    it("should create a ring with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "ring-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RingGeometryNode(mockNode);
      const context = createMockContext({
        thetaSegments: 8,
        phiSegments: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          theta: 8,
          phi: 2,
        });
        // With fewer theta segments, we get fewer vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeLessThan(66);
        expect(result.outputs.metadata.triangleCount).toBeLessThan(64);
      }
    });

    it("should create a partial ring", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "ring-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RingGeometryNode(mockNode);
      const context = createMockContext({
        thetaLength: Math.PI, // Half circle
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.angles).toEqual({
          start: 0,
          length: Math.PI,
          isFullCircle: false,
        });
      }
    });

    it("should handle invalid inputs - outer radius less than inner radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "ring-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RingGeometryNode(mockNode);
      const context = createMockContext({
        innerRadius: 2,
        outerRadius: 1, // Invalid: outer radius less than inner radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create ring geometry");
      }
    });

    it("should handle invalid inputs - negative radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "ring-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RingGeometryNode(mockNode);
      const context = createMockContext({
        innerRadius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create ring geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = RingGeometryNode.nodeType;

      expect(nodeType.id).toBe("ring-geometry");
      expect(nodeType.name).toBe("Ring Geometry");
      expect(nodeType.type).toBe("ring-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("circle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(6);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "innerRadius",
        "outerRadius",
        "thetaSegments",
        "phiSegments",
        "thetaStart",
        "thetaLength",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
