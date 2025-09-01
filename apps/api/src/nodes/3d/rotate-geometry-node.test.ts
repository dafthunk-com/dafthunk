import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BoxGeometryNode } from "./box-geometry-node";
import { RotateGeometryNode } from "./rotate-geometry-node";

describe("RotateGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should rotate geometry by default values (no rotation)", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.bufferGeometry.data).toBeInstanceOf(Uint8Array);
        expect(result.outputs.metadata).toBeDefined();
        expect(result.outputs.metadata.rotation).toEqual({ x: 0, y: 0, z: 0 });
        expect(result.outputs.metadata.vertexCount).toBe(24);
        expect(result.outputs.metadata.triangleCount).toBe(12);

        // Original and new bounds should be the same since no rotation was applied
        expect(result.outputs.metadata.originalBounds).toEqual(
          result.outputs.metadata.newBounds
        );
      }
    });

    it("should rotate geometry around X-axis", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry around X-axis (90 degrees = π/2 radians)
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: Math.PI / 2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.rotation).toEqual({
          x: Math.PI / 2,
          y: 0,
          z: 0,
        });

        // Check that bounds changed due to rotation
        const _originalBounds = result.outputs.metadata.originalBounds;
        const _newBounds = result.outputs.metadata.newBounds;

        // Verify that rotation was applied correctly
        expect(result.outputs.metadata.rotation.x).toBe(Math.PI / 2);
        expect(result.outputs.metadata.rotation.y).toBe(0);
        expect(result.outputs.metadata.rotation.z).toBe(0);
      }
    });

    it("should rotate geometry around Y-axis", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry around Y-axis (45 degrees = π/4 radians)
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        y: Math.PI / 4,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.rotation).toEqual({
          x: 0,
          y: Math.PI / 4,
          z: 0,
        });

        // Check that bounds changed due to rotation
        const _originalBounds = result.outputs.metadata.originalBounds;
        const _newBounds = result.outputs.metadata.newBounds;

        // Verify that rotation was applied correctly
        expect(result.outputs.metadata.rotation.x).toBe(0);
        expect(result.outputs.metadata.rotation.y).toBe(Math.PI / 4);
        expect(result.outputs.metadata.rotation.z).toBe(0);
      }
    });

    it("should rotate geometry around Z-axis", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry around Z-axis (30 degrees = π/6 radians)
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        z: Math.PI / 6,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.rotation).toEqual({
          x: 0,
          y: 0,
          z: Math.PI / 6,
        });

        // Check that bounds changed due to rotation
        const _originalBounds = result.outputs.metadata.originalBounds;
        const _newBounds = result.outputs.metadata.newBounds;

        // Verify that rotation was applied correctly
        expect(result.outputs.metadata.rotation.x).toBe(0);
        expect(result.outputs.metadata.rotation.y).toBe(0);
        expect(result.outputs.metadata.rotation.z).toBe(Math.PI / 6);
      }
    });

    it("should rotate geometry around all axes", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry around all axes
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: Math.PI / 3, // 60 degrees
        y: Math.PI / 4, // 45 degrees
        z: Math.PI / 6, // 30 degrees
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.rotation).toEqual({
          x: Math.PI / 3,
          y: Math.PI / 4,
          z: Math.PI / 6,
        });

        // Check that bounds changed due to rotation
        const _originalBounds = result.outputs.metadata.originalBounds;
        const _newBounds = result.outputs.metadata.newBounds;

        // Verify that rotation was applied correctly
        expect(result.outputs.metadata.rotation.x).toBe(Math.PI / 3);
        expect(result.outputs.metadata.rotation.y).toBe(Math.PI / 4);
        expect(result.outputs.metadata.rotation.z).toBe(Math.PI / 6);
      }
    });

    it("should handle full rotation (360 degrees)", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry 360 degrees around Y-axis
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        y: 2 * Math.PI, // 360 degrees
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.rotation).toEqual({
          x: 0,
          y: 2 * Math.PI,
          z: 0,
        });

        // After 360° rotation, bounds should be very close to original (within floating point precision)
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBeCloseTo(originalBounds.minX, 3);
        expect(newBounds.maxX).toBeCloseTo(originalBounds.maxX, 3);
        expect(newBounds.minY).toBeCloseTo(originalBounds.minY, 3);
        expect(newBounds.maxY).toBeCloseTo(originalBounds.maxY, 3);
        expect(newBounds.minZ).toBeCloseTo(originalBounds.minZ, 3);
        expect(newBounds.maxZ).toBeCloseTo(originalBounds.maxZ, 3);
      }
    });

    it("should handle negative rotation angles", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);

      // First create a box geometry to rotate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now rotate the box geometry with negative angles
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: -Math.PI / 2, // -90 degrees
        y: -Math.PI / 4, // -45 degrees
        z: -Math.PI / 6, // -30 degrees
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.rotation).toEqual({
          x: -Math.PI / 2,
          y: -Math.PI / 4,
          z: -Math.PI / 6,
        });

        // Check that bounds changed due to rotation
        const _originalBounds = result.outputs.metadata.originalBounds;
        const _newBounds = result.outputs.metadata.newBounds;

        // Verify that rotation was applied correctly
        expect(result.outputs.metadata.rotation.x).toBe(-Math.PI / 2);
        expect(result.outputs.metadata.rotation.y).toBe(-Math.PI / 4);
        expect(result.outputs.metadata.rotation.z).toBe(-Math.PI / 6);
      }
    });

    it("should handle missing bufferGeometry input", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to rotate geometry");
      }
    });

    it("should handle invalid bufferGeometry data", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "rotate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new RotateGeometryNode(mockNode);
      const context = createMockContext({
        bufferGeometry: {
          data: new Uint8Array([1, 2, 3, 4]), // Invalid data
          mimeType: "application/x-buffer-geometry",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to rotate geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = RotateGeometryNode.nodeType;

      expect(nodeType.id).toBe("rotate-geometry");
      expect(nodeType.name).toBe("Rotate Geometry");
      expect(nodeType.type).toBe("rotate-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("rotate-cw");
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
