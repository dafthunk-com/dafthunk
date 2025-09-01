import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BoxGeometryNode } from "./box-geometry-node";
import { TranslateGeometryNode } from "./translate-geometry-node";

describe("TranslateGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should translate geometry by default values (no translation)", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);

      // First create a box geometry to translate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now translate the box geometry
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.bufferGeometry.data).toBeInstanceOf(Uint8Array);
        expect(result.outputs.metadata).toBeDefined();
        expect(result.outputs.metadata.translation).toEqual({
          x: 0,
          y: 0,
          z: 0,
        });
        expect(result.outputs.metadata.vertexCount).toBe(24);
        expect(result.outputs.metadata.triangleCount).toBe(12);

        // Original and new bounds should be the same since no translation was applied
        expect(result.outputs.metadata.originalBounds).toEqual(
          result.outputs.metadata.newBounds
        );
      }
    });

    it("should translate geometry by X offset", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);

      // First create a box geometry to translate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now translate the box geometry by X offset
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 5.0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.translation).toEqual({
          x: 5.0,
          y: 0,
          z: 0,
        });

        // Check that bounds were translated by X offset
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBe(originalBounds.minX + 5.0);
        expect(newBounds.maxX).toBe(originalBounds.maxX + 5.0);
        expect(newBounds.minY).toBe(originalBounds.minY);
        expect(newBounds.maxY).toBe(originalBounds.maxY);
        expect(newBounds.minZ).toBe(originalBounds.minZ);
        expect(newBounds.maxZ).toBe(originalBounds.maxZ);
      }
    });

    it("should translate geometry by Y offset", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);

      // First create a box geometry to translate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now translate the box geometry by Y offset
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        y: -3.0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.translation).toEqual({
          x: 0,
          y: -3.0,
          z: 0,
        });

        // Check that bounds were translated by Y offset
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBe(originalBounds.minX);
        expect(newBounds.maxX).toBe(originalBounds.maxX);
        expect(newBounds.minY).toBe(originalBounds.minY - 3.0);
        expect(newBounds.maxY).toBe(originalBounds.maxY - 3.0);
        expect(newBounds.minZ).toBe(originalBounds.minZ);
        expect(newBounds.maxZ).toBe(originalBounds.maxZ);
      }
    });

    it("should translate geometry by Z offset", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);

      // First create a box geometry to translate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now translate the box geometry by Z offset
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        z: 2.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.translation).toEqual({
          x: 0,
          y: 0,
          z: 2.5,
        });

        // Check that bounds were translated by Z offset
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBe(originalBounds.minX);
        expect(newBounds.maxX).toBe(originalBounds.maxX);
        expect(newBounds.minY).toBe(originalBounds.minY);
        expect(newBounds.maxY).toBe(originalBounds.maxY);
        expect(newBounds.minZ).toBe(originalBounds.minZ + 2.5);
        expect(newBounds.maxZ).toBe(originalBounds.maxZ + 2.5);
      }
    });

    it("should translate geometry by all axes", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);

      // First create a box geometry to translate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now translate the box geometry by all axes
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: 1.0,
        y: 2.0,
        z: 3.0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.translation).toEqual({
          x: 1.0,
          y: 2.0,
          z: 3.0,
        });

        // Check that bounds were translated by all offsets
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBe(originalBounds.minX + 1.0);
        expect(newBounds.maxX).toBe(originalBounds.maxX + 1.0);
        expect(newBounds.minY).toBe(originalBounds.minY + 2.0);
        expect(newBounds.maxY).toBe(originalBounds.maxY + 2.0);
        expect(newBounds.minZ).toBe(originalBounds.minZ + 3.0);
        expect(newBounds.maxZ).toBe(originalBounds.maxZ + 3.0);
      }
    });

    it("should handle negative translation values", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);

      // First create a box geometry to translate
      const boxNode = new BoxGeometryNode(mockNode);
      const boxContext = createMockContext({});
      const boxResult = await boxNode.execute(boxContext);

      expect(boxResult.status).toBe("completed");
      if (boxResult.status !== "completed" || !boxResult.outputs) {
        throw new Error("Failed to create box geometry");
      }

      // Now translate the box geometry by negative values
      const context = createMockContext({
        bufferGeometry: boxResult.outputs.bufferGeometry,
        x: -1.5,
        y: -2.5,
        z: -0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.translation).toEqual({
          x: -1.5,
          y: -2.5,
          z: -0.5,
        });

        // Check that bounds were translated by negative offsets
        const originalBounds = result.outputs.metadata.originalBounds;
        const newBounds = result.outputs.metadata.newBounds;

        expect(newBounds.minX).toBe(originalBounds.minX - 1.5);
        expect(newBounds.maxX).toBe(originalBounds.maxX - 1.5);
        expect(newBounds.minY).toBe(originalBounds.minY - 2.5);
        expect(newBounds.maxY).toBe(originalBounds.maxY - 2.5);
        expect(newBounds.minZ).toBe(originalBounds.minZ - 0.5);
        expect(newBounds.maxZ).toBe(originalBounds.maxZ - 0.5);
      }
    });

    it("should handle missing bufferGeometry input", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to translate geometry");
      }
    });

    it("should handle invalid bufferGeometry data", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "translate-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TranslateGeometryNode(mockNode);
      const context = createMockContext({
        bufferGeometry: {
          data: new Uint8Array([1, 2, 3, 4]), // Invalid data
          mimeType: "application/x-buffer-geometry",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to translate geometry");
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = TranslateGeometryNode.nodeType;

      expect(nodeType.id).toBe("translate-geometry");
      expect(nodeType.name).toBe("Translate Geometry");
      expect(nodeType.type).toBe("translate-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("move");
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
