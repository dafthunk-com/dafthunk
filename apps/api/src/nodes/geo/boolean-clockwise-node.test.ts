import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanClockwiseNode } from "./boolean-clockwise-node";

describe("BooleanClockwiseNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new BooleanClockwiseNode({
    id: "test-node",
    name: "Test Node",
    type: "boolean-clockwise",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  it("returns true for clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for counter-clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns true for clockwise ring with LineString geometry", async () => {
    const context = createMockContext({
      line: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
          [2, 0],
          [0, 0],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for counter-clockwise ring with LineString geometry", async () => {
    const context = createMockContext({
      line: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 0],
        ],
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns true for clockwise ring with coordinate array", async () => {
    const context = createMockContext({
      line: [
        [0, 0],
        [3, 3],
        [3, 0],
        [0, 0],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for counter-clockwise ring with coordinate array", async () => {
    const context = createMockContext({
      line: [
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 0],
      ],
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns true for larger clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for larger counter-clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns true for complex clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, 5],
            [10, 5],
            [10, 0],
            [5, -5],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for complex counter-clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, -5],
            [10, 0],
            [10, 5],
            [5, 5],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns true for square clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for square counter-clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 4],
            [4, 4],
            [4, 0],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns true for triangle clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [6, 0],
            [3, 6],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(true);
  });

  it("returns false for triangle counter-clockwise ring", async () => {
    const context = createMockContext({
      line: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [3, 6],
            [6, 0],
            [0, 0],
          ],
        },
      },
    });
    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.isClockwise).toBe(false);
  });

  it("returns an error for missing line input", async () => {
    const context = createMockContext({});
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for null line input", async () => {
    const context = createMockContext({
      line: null,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });

  it("returns an error for undefined line input", async () => {
    const context = createMockContext({
      line: undefined,
    });
    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing line input");
  });
});
