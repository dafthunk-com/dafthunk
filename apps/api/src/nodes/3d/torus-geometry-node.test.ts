import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { TorusGeometryNode } from "./torus-geometry-node";

describe("TorusGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default torus geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusGeometryNode(mockNode);
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
          vertexCount: 561, // (16 + 1) * (32 + 1) vertices for default torus
          triangleCount: 1024, // 16 * 32 * 2 triangles for default torus
          dimensions: {
            radius: 1,
            tube: 0.4,
            outerRadius: 1.4,
            innerRadius: 0.6,
          },
          segments: {
            radial: 16,
            tubular: 32,
          },
          arc: {
            angle: 2 * Math.PI,
            isFullCircle: true,
          },
        });
      }
    });

    it("should create a torus with custom radius and tube", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
        tube: 0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 561,
          triangleCount: 1024,
          dimensions: {
            radius: 2,
            tube: 0.5,
            outerRadius: 2.5,
            innerRadius: 1.5,
          },
          segments: {
            radial: 16,
            tubular: 32,
          },
          arc: {
            angle: 2 * Math.PI,
            isFullCircle: true,
          },
        });
      }
    });

    it("should create a torus with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusGeometryNode(mockNode);
      const context = createMockContext({
        radialSegments: 8,
        tubularSegments: 16,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          radial: 8,
          tubular: 16,
        });
        // With fewer segments, we get fewer vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeLessThan(561);
        expect(result.outputs.metadata.triangleCount).toBeLessThan(1024);
      }
    });

    it("should create a partial torus", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusGeometryNode(mockNode);
      const context = createMockContext({
        arc: Math.PI, // Half torus
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.arc).toEqual({
          angle: Math.PI,
          isFullCircle: false,
        });
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create torus geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = TorusGeometryNode.nodeType;

      expect(nodeType.id).toBe("torus-geometry");
      expect(nodeType.name).toBe("Torus Geometry");
      expect(nodeType.type).toBe("torus-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("circle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(5);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radius",
        "tube",
        "radialSegments",
        "tubularSegments",
        "arc",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
