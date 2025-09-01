import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { TorusKnotGeometryNode } from "./torus-knot-geometry-node";

describe("TorusKnotGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  describe("execute", () => {
    it("should create default torus knot geometry", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.bufferGeometry).toBeDefined();
        expect(result.outputs.bufferGeometry.data).toBeInstanceOf(Uint8Array);
        expect(result.outputs.metadata).toBeDefined();
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
        expect(result.outputs.metadata.parameters.radius).toBe(1);
        expect(result.outputs.metadata.parameters.tube).toBe(0.3);
        expect(result.outputs.metadata.parameters.p).toBe(2);
        expect(result.outputs.metadata.parameters.q).toBe(3);
        expect(result.outputs.metadata.parameters.knotType).toBe("Trefoil");
      }
    });

    it("should create torus knot geometry with custom parameters", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
        tube: 0.5,
        tubularSegments: 32,
        radialSegments: 16,
        p: 3,
        q: 4,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.parameters.radius).toBe(2);
        expect(result.outputs.metadata.parameters.tube).toBe(0.5);
        expect(result.outputs.metadata.parameters.tubularSegments).toBe(32);
        expect(result.outputs.metadata.parameters.radialSegments).toBe(16);
        expect(result.outputs.metadata.parameters.p).toBe(3);
        expect(result.outputs.metadata.parameters.q).toBe(4);
        expect(result.outputs.metadata.parameters.knotType).toBe(
          "Solomon's Seal"
        );
      }
    });

    it("should create different knot types", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);

      // Test Cinquefoil knot
      const context1 = createMockContext({
        p: 2,
        q: 5,
      });

      const result1 = await node.execute(context1);
      expect(result1.status).toBe("completed");
      if (result1.status === "completed" && result1.outputs) {
        expect(result1.outputs.metadata.parameters.knotType).toBe("Cinquefoil");
      }

      // Test Septafoil knot
      const context2 = createMockContext({
        p: 3,
        q: 5,
      });

      const result2 = await node.execute(context2);
      expect(result2.status).toBe("completed");
      if (result2.status === "completed" && result2.outputs) {
        expect(result2.outputs.metadata.parameters.knotType).toBe("Septafoil");
      }
    });

    it("should calculate complexity correctly", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);

      // Simple knot (Trefoil: p=2, q=3, complexity=6)
      const context1 = createMockContext({
        p: 2,
        q: 3,
      });

      const result1 = await node.execute(context1);
      expect(result1.status).toBe("completed");
      if (result1.status === "completed" && result1.outputs) {
        expect(result1.outputs.metadata.parameters.complexity).toBe("Simple");
      }

      // Complex knot (p=5, q=7, complexity=35)
      const context2 = createMockContext({
        p: 5,
        q: 7,
      });

      const result2 = await node.execute(context2);
      expect(result2.status).toBe("completed");
      if (result2.status === "completed" && result2.outputs) {
        expect(result2.outputs.metadata.parameters.complexity).toBe(
          "Very Complex"
        );
      }
    });

    it("should handle custom knot parameters", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        p: 7,
        q: 11,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.parameters.knotType).toBe(
          "Custom (7,11)"
        );
        expect(result.outputs.metadata.parameters.complexity).toBe(
          "Very Complex"
        );
      }
    });

    it("should handle high segment counts", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        tubularSegments: 128,
        radialSegments: 32,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.parameters.tubularSegments).toBe(128);
        expect(result.outputs.metadata.parameters.radialSegments).toBe(32);
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
      }
    });

    it("should handle invalid radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        radius: -1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to create torus knot geometry");
      }
    });

    it("should handle invalid tube radius", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        tube: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to create torus knot geometry");
      }
    });

    it("should handle invalid p parameter", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        p: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      if (result.status === "error" && result.error) {
        expect(result.error).toContain("Failed to create torus knot geometry");
      }
    });

    it("should calculate correct dimensions", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        radius: 2,
        tube: 0.5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        const dimensions = result.outputs.metadata.dimensions;
        expect(dimensions.width).toBeGreaterThan(0);
        expect(dimensions.height).toBeGreaterThan(0);
        expect(dimensions.depth).toBeGreaterThan(0);
        expect(dimensions.center).toBeDefined();
        // Check that center coordinates are finite numbers
        expect(Number.isFinite(dimensions.center.x)).toBe(true);
        expect(Number.isFinite(dimensions.center.y)).toBe(true);
        expect(Number.isFinite(dimensions.center.z)).toBe(true);
      }
    });

    it("should handle edge case with minimal segments", async () => {
      const mockNode = {
        id: "test-node",
        name: "Test Node",
        type: "torus-knot-geometry",
        description: "Test",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [],
      };
      const node = new TorusKnotGeometryNode(mockNode);
      const context = createMockContext({
        tubularSegments: 3,
        radialSegments: 3,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      if (result.status === "completed" && result.outputs) {
        expect(result.outputs.metadata.parameters.tubularSegments).toBe(3);
        expect(result.outputs.metadata.parameters.radialSegments).toBe(3);
        expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
      }
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = TorusKnotGeometryNode.nodeType;

      expect(nodeType.id).toBe("torus-knot-geometry");
      expect(nodeType.name).toBe("Torus Knot Geometry");
      expect(nodeType.type).toBe("torus-knot-geometry");
      expect(nodeType.tags).toEqual(["3D"]);
      expect(nodeType.icon).toBe("infinity");
      expect(nodeType.inlinable).toBe(true);

      expect(nodeType.inputs).toHaveLength(6);
      expect(nodeType.outputs).toHaveLength(2);

      // Check inputs
      const inputNames = nodeType.inputs.map((input) => input.name);
      expect(inputNames).toEqual([
        "radius",
        "tube",
        "tubularSegments",
        "radialSegments",
        "p",
        "q",
      ]);

      // Check outputs
      const outputNames = nodeType.outputs.map((output) => output.name);
      expect(outputNames).toEqual(["bufferGeometry", "metadata"]);
    });
  });
});
