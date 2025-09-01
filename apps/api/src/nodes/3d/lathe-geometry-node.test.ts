import { describe, expect, it } from "vitest";

import { LatheGeometryNode } from "./lathe-geometry-node";

describe("LatheGeometryNode", () => {
  const mockNode = {
    id: "test-node",
    name: "Test Node",
    type: "lathe-geometry",
    position: { x: 0, y: 0 },
    inputs: {},
    outputs: {},
  };

  const mockContext = {
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    env: {},
  };

  it("should create default lathe geometry", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [
          [0, 0],
          [0.5, 0.5],
          [1, 0],
        ],
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    if (result.status === "completed" && result.outputs) {
      expect(result.outputs.bufferGeometry).toBeDefined();
      expect(result.outputs.bufferGeometry.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs.metadata).toBeDefined();
      expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
      expect(result.outputs.metadata.parameters.pointCount).toBe(3);
      expect(result.outputs.metadata.parameters.segments).toBe(12);
      expect(result.outputs.metadata.parameters.isFullCircle).toBe(true);
    }
  });

  it("should create lathe geometry with custom segments", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [
          [0, 0],
          [0.5, 0.5],
          [1, 0],
        ],
        segments: 24,
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    if (result.status === "completed" && result.outputs) {
      expect(result.outputs.metadata.parameters.segments).toBe(24);
      expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
    }
  });

  it("should create lathe geometry with partial arc", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [
          [0, 0],
          [0.5, 0.5],
          [1, 0],
        ],
        phiStart: 0,
        phiLength: Math.PI, // Half circle
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    if (result.status === "completed" && result.outputs) {
      expect(result.outputs.metadata.parameters.phiStart).toBe(0);
      expect(result.outputs.metadata.parameters.phiLength).toBe(Math.PI);
      expect(result.outputs.metadata.parameters.isFullCircle).toBe(false);
    }
  });

  it("should create lathe geometry with complex shape", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [
          [0, 0],
          [0.2, 0.1],
          [0.5, 0.3],
          [0.8, 0.1],
          [1, 0],
          [0.8, -0.1],
          [0.5, -0.3],
          [0.2, -0.1],
          [0, 0],
        ],
        segments: 16,
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    if (result.status === "completed" && result.outputs) {
      expect(result.outputs.metadata.parameters.pointCount).toBe(9);
      expect(result.outputs.metadata.parameters.segments).toBe(16);
      expect(result.outputs.metadata.vertexCount).toBeGreaterThan(0);
    }
  });

  it("should handle invalid points array", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [[0, 0]], // Only one point - invalid
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    if (result.status === "error" && result.error) {
      expect(result.error).toContain("Failed to create lathe geometry");
    }
  });

  it("should handle invalid point format", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [[0, 0], [0.5]], // Invalid point format
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    if (result.status === "error" && result.error) {
      expect(result.error).toContain("Failed to create lathe geometry");
    }
  });

  it("should handle negative segments", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [
          [0, 0],
          [0.5, 0.5],
          [1, 0],
        ],
        segments: -1,
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    if (result.status === "error" && result.error) {
      expect(result.error).toContain("Failed to create lathe geometry");
    }
  });

  it("should calculate correct dimensions", async () => {
    const node = new LatheGeometryNode(mockNode as any);
    const context = {
      ...mockContext,
      inputs: {
        points: [
          [0, 0],
          [0.5, 0.5],
          [1, 0],
        ],
      },
    } as any;

    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    if (result.status === "completed" && result.outputs) {
      const dimensions = result.outputs.metadata.dimensions;
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.depth).toBeGreaterThan(0);
      expect(dimensions.center).toBeDefined();
      expect(dimensions.center.x).toBeCloseTo(0, 1);
      expect(dimensions.center.y).toBeCloseTo(0.25, 1);
      expect(dimensions.center.z).toBeCloseTo(0, 1);
    }
  });
});
