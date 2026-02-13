import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { RandomNumberNode } from "./random-number-node";

describe("RandomNumberNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "random-number",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should generate a random float between 0 and 1 by default", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeDefined();
    expect(typeof result.outputs?.value).toBe("number");
    expect(result.outputs?.value).toBeGreaterThanOrEqual(0);
    expect(result.outputs?.value).toBeLessThanOrEqual(1);
  });

  it("should generate a random float within custom range", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(createContext({ min: 5, max: 10 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeGreaterThanOrEqual(5);
    expect(result.outputs?.value).toBeLessThanOrEqual(10);
  });

  it("should generate a random integer within range", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ min: 1, max: 10, integer: true })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeDefined();
    expect(Number.isInteger(result.outputs?.value)).toBe(true);
    expect(result.outputs?.value).toBeGreaterThanOrEqual(1);
    expect(result.outputs?.value).toBeLessThan(10);
  });

  it("should generate integers in range [0, 100)", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ min: 0, max: 100, integer: true })
    );

    expect(result.status).toBe("completed");
    expect(Number.isInteger(result.outputs?.value)).toBe(true);
    expect(result.outputs?.value).toBeGreaterThanOrEqual(0);
    expect(result.outputs?.value).toBeLessThan(100);
  });

  it("should handle negative ranges", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ min: -10, max: -5, integer: true })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeGreaterThanOrEqual(-10);
    expect(result.outputs?.value).toBeLessThan(-5);
  });

  it("should generate different numbers on each call", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const results = await Promise.all([
      node.execute(createContext({ min: 0, max: 1000000 })),
      node.execute(createContext({ min: 0, max: 1000000 })),
      node.execute(createContext({ min: 0, max: 1000000 })),
    ]);

    expect(results[0].status).toBe("completed");
    expect(results[1].status).toBe("completed");
    expect(results[2].status).toBe("completed");

    // Very unlikely all three are the same
    const allSame =
      results[0].outputs?.value === results[1].outputs?.value &&
      results[1].outputs?.value === results[2].outputs?.value;
    expect(allSame).toBe(false);
  });

  it("should return error if min is greater than or equal to max", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(createContext({ min: 10, max: 5 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("min");
    expect(result.error).toContain("max");
  });

  it("should return error if min equals max", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(createContext({ min: 5, max: 5 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("min");
    expect(result.error).toContain("max");
  });

  it("should return error for invalid min type", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ min: "invalid", max: 10 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid min value");
  });

  it("should return error for invalid max type", async () => {
    const node = new RandomNumberNode({
      nodeId: "random-number",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ min: 0, max: "invalid" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid max value");
  });
});
