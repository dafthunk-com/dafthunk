import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BoxGeometryNode } from "./box-geometry-node";
import { ScaleGeometryNode } from "./scale-geometry-node";

describe("ScaleGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should scale geometry by default values (no scaling)", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.bufferGeometry.data).toBeInstanceOf(Uint8Array);
        expect(result.outputs.metadata).toBeDefined();
        expect(result.outputs.metadata.scale).toEqual({ x: 1, y: 1, z: 1 });
        expect(result.outputs.metadata.vertexCount).toBe(24);
        expect(result.outputs.metadata.triangleCount).toBe(12);

        // Original and new bounds should be the same since no scaling was applied
        expect(result.outputs.metadata.originalBounds).toEqual(
          result.outputs.metadata.newBounds
        );
      }
    });

    it("should scale geometry by X factor", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry by X factor
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 2.0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.scale).toEqual({ x: 2.0, y: 1, z: 1 });

        // Check that bounds were scaled by X factor
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX * 2.0, 5);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX * 2.0, 5);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY, 5);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY, 5);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ, 5);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ, 5);
      }
    });

    it("should scale geometry by Y factor", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry by Y factor
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        y: 1.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.scale).toEqual({ x: 1, y: 1.5, z: 1 });

        // Check that bounds were scaled by Y factor
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX, 5);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX, 5);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY * 1.5, 5);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY * 1.5, 5);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ, 5);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ, 5);
      }
    });

    it("should scale geometry by Z factor", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry by Z factor
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        z: 0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.scale).toEqual({ x: 1, y: 1, z: 0.5 });

        // Check that bounds were scaled by Z factor
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX, 5);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX, 5);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY, 5);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY, 5);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ * 0.5, 5);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ * 0.5, 5);
      }
    });

    it("should scale geometry by all axes", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry by all axes
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 2.0,
        y: 1.5,
        z: 0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.scale).toEqual({
          x: 2.0,
          y: 1.5,
          z: 0.5,
        });

        // Check that bounds were scaled by all factors
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX * 2.0, 5);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX * 2.0, 5);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY * 1.5, 5);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY * 1.5, 5);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ * 0.5, 5);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ * 0.5, 5);
      }
    });

    it("should handle uniform scaling", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry uniformly
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 3.0,
        y: 3.0,
        z: 3.0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.scale).toEqual({
          x: 3.0,
          y: 3.0,
          z: 3.0,
        });

        // Check that bounds were scaled uniformly
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX * 3.0, 5);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX * 3.0, 5);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY * 3.0, 5);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY * 3.0, 5);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ * 3.0, 5);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ * 3.0, 5);
      }
    });

    it("should handle small scale factors", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now scale the box geometry with small factors
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 0.1,
        y: 0.2,
        z: 0.3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.scale).toEqual({
          x: 0.1,
          y: 0.2,
          z: 0.3,
        });

        // Check that bounds were scaled by small factors
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX * 0.1, 5);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX * 0.1, 5);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY * 0.2, 5);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY * 0.2, 5);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ * 0.3, 5);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ * 0.3, 5);
      }
    });

    it("should handle missing bufferGeometry input", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to scale geometry");
      }
    });

    it("should handle invalid bufferGeometry data", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);
      const context = createMockContext({
        bufferGeometry: {
          data: new Uint8Array([1, 2, 3, 4]), // Invalid data
          mimeType: "application/x-buffer-geometry",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to scale geometry");
      }
    });

    it("should handle invalid scale factors", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "scale-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new ScaleGeometryNode(mockNode);

      // First create a box geometry to scale
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now try to scale with invalid factors
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 0, // Invalid: must be positive
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to scale geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = ScaleGeometryNode.nodeType;

      expect(nodeType.id).toBe("scale-geometry");
      expect(nodeType.name).toBe("Scale Geometry");
      expect(nodeType.type).toBe("scale-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("expand");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(4);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual(["bufferGeometry", "x", "y", "z"]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
