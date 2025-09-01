import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { SphereGeometryNode } from "./sphere-geometry-node";

describe("SphereGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default sphere geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "sphere-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new SphereGeometryNode(mockNode);
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
          vertexCount: 561, // (32 + 1) * (16 + 1) vertices for default sphere
          triangleCount: 960, // 32 * 16 * 2 triangles for default sphere
          dimensions: {
            radius: 1,
            diameter: 2,
          },
          segments: {
            width: 32,
            height: 16,
          },
          angles: {
            phiStart: 0,
            phiLength: 2 * Math.PI,
            thetaStart: 0,
            thetaLength: Math.PI,
            isFullSphere: true,
          },
        });
      }
    });

    it("should create a sphere with custom radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "sphere-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new SphereGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: 561,
          triangleCount: 960,
          dimensions: {
            radius: 2,
            diameter: 4,
          },
          segments: {
            width: 32,
            height: 16,
          },
          angles: {
            phiStart: 0,
            phiLength: 2 * Math.PI,
            thetaStart: 0,
            thetaLength: Math.PI,
            isFullSphere: true,
          },
        });
      }
    });

    it("should create a sphere with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "sphere-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new SphereGeometryNode(mockNode);
      const context = createMockContext({
        widthSegments: 8,
        heightSegments: 6,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          width: 8,
          height: 6,
        });
        // With fewer segments, we get fewer vertices and triangles
        expect(result.outputs.metadata.vertexCount).toBeLessThan(561);
        expect(result.outputs.metadata.triangleCount).toBeLessThan(960);
      }
    });

    it("should create a partial sphere", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "sphere-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new SphereGeometryNode(mockNode);
      const context = createMockContext({
        phiLength: Math.PI, // Half sphere horizontally
        thetaLength: Math.PI / 2, // Quarter sphere vertically
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.angles).toEqual({
          phiStart: 0,
          phiLength: Math.PI,
          thetaStart: 0,
          thetaLength: Math.PI / 2,
          isFullSphere: false,
        });
      }
    });

    it("should create a sphere with custom start angles", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "sphere-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new SphereGeometryNode(mockNode);
      const context = createMockContext({
        phiStart: Math.PI / 2, // Start at 90 degrees
        thetaStart: Math.PI / 4, // Start at 45 degrees
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.angles).toEqual({
          phiStart: Math.PI / 2,
          phiLength: 2 * Math.PI,
          thetaStart: Math.PI / 4,
          thetaLength: Math.PI,
          isFullSphere: false,
        });
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "sphere-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new SphereGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create sphere geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = SphereGeometryNode.nodeType;

      expect(nodeType.id).toBe("sphere-geometry");
      expect(nodeType.name).toBe("Sphere Geometry");
      expect(nodeType.type).toBe("sphere-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("circle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(7);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radius",
        "widthSegments",
        "heightSegments",
        "phiStart",
        "phiLength",
        "thetaStart",
        "thetaLength",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
