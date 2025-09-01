import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CircleGeometryNode } from "./circle-geometry-node";

describe("CircleGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create a default circle geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "circle-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CircleGeometryNode(mockNode);
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
            diameter: 2,
            circumference: 2 * Math.PI,
            area: Math.PI,
          },
          segments: {
            segments: 32,
            thetaStart: 0,
            thetaLength: 2 * Math.PI,
            isFullCircle: true,
          },
        });
      }
    });

    it("should create a circle with custom radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "circle-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CircleGeometryNode(mockNode);
      const context = createMockContext({
        radius: 5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata).toEqual({
          vertexCount: expect.any(Number),
          triangleCount: expect.any(Number),
          dimensions: {
            radius: 5,
            diameter: 10,
            circumference: 10 * Math.PI,
            area: 25 * Math.PI,
          },
          segments: {
            segments: 32,
            thetaStart: 0,
            thetaLength: 2 * Math.PI,
            isFullCircle: true,
          },
        });
      }
    });

    it("should create a circle with custom segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "circle-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CircleGeometryNode(mockNode);
      const context = createMockContext({
        segments: 16,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          segments: 16,
          thetaStart: 0,
          thetaLength: 2 * Math.PI,
          isFullCircle: true,
        });
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
        expect(result.outputs.metadata.triangleCount).toBeGreaterThan(0);
      }
    });

    it("should create a partial circle (arc)", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "circle-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CircleGeometryNode(mockNode);
      const context = createMockContext({
        thetaStart: Math.PI / 4, // 45 degrees
        thetaLength: Math.PI / 2, // 90 degrees
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.metadata.segments).toEqual({
          segments: 32,
          thetaStart: Math.PI / 4,
          thetaLength: Math.PI / 2,
          isFullCircle: false,
        });
      }
    });

    it("should handle invalid inputs", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "circle-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CircleGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1, // Invalid negative radius
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create circle geometry");
      }
    });

    it("should handle invalid segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "circle-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new CircleGeometryNode(mockNode);
      const context = createMockContext({
        segments: 2, // Invalid: must be at least 3
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Failed to create circle geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = CircleGeometryNode.nodeType;

      expect(nodeType.id).toBe("circle-geometry");
      expect(nodeType.name).toBe("Circle Geometry");
      expect(nodeType.type).toBe("circle-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("circle");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(4);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radius",
        "segments",
        "thetaStart",
        "thetaLength",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
