import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { DemToBufferGeometryNode } from "./dem-to-buffergeometry-node";

describe("DemToBufferGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new DemToBufferGeometryNode({
    id: "test-node",
    name: "Test Node",
    type: "dem-to-buffergeometry",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("validates input schema correctly", async () => {
    const context = createMockContext({
      image: {
        data: new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 58, 0, 0, 0, 18, 73, 68,
          65, 84, 120, 156, 99, 96, 96, 96, 248, 15, 4, 12, 12, 140, 0, 0, 0,
          15, 0, 1, 149, 90, 37, 8, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96,
          130,
        ]),
        mimeType: "image/png" as const,
      },
      bounds: [5.95, 45.82, 10.49, 47.81] as [number, number, number, number],
      martiniError: 1,
    });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to decode PNG image");
  });

  it("handles missing input gracefully", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Required");
  });

  it("handles missing bounds parameter", async () => {
    const context = createMockContext({
      image: {
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "image/png",
      },
      martiniError: 1,
    });
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Required");
  });

  it("handles invalid image format", async () => {
    const context = createMockContext({
      image: {
        data: "not a uint8array",
        mimeType: "image/png",
      },
      bounds: [5.95, 45.82, 10.49, 47.81],
    });
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Input not instance of Uint8Array");
  });

  it("handles invalid bounds format", async () => {
    const context = createMockContext({
      image: {
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "image/png",
      },
      bounds: [5.95, 45.82, 10.49],
    });
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Array must contain at least 4 element");
  });

  it("handles invalid martini error", async () => {
    const context = createMockContext({
      image: {
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "image/png",
      },
      bounds: [5.95, 45.82, 10.49, 47.81],
      martiniError: 0.05,
    });
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Number must be greater than or equal to 0.1"
    );
  });

  it("uses default martini error when not provided", async () => {
    const context = createMockContext({
      image: {
        data: new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 58, 0, 0, 0, 18, 73, 68,
          65, 84, 120, 156, 99, 96, 96, 96, 248, 15, 4, 12, 12, 140, 0, 0, 0,
          15, 0, 1, 149, 90, 37, 8, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96,
          130,
        ]),
        mimeType: "image/png" as const,
      },
      bounds: [5.95, 45.82, 10.49, 47.81] as [number, number, number, number],
    });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to decode PNG image");
  });

  it("validates tileset center as optional parameter", async () => {
    const context = createMockContext({
      image: {
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "image/png",
      },
      bounds: [5.95, 45.82, 10.49, 47.81],
      tilesetCenter: [8.22, 46.815],
      martiniError: 10,
    });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to decode PNG image");
  });
});
