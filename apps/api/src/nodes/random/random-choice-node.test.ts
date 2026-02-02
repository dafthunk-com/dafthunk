import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { RandomChoiceNode } from "./random-choice-node";

describe("RandomChoiceNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "random-choice",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should select a single random item from array", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = ["apple", "banana", "cherry"];
    const result = await node.execute(createContext({ options }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeDefined();
    expect(options).toContain(result.outputs?.value);
  });

  it("should select multiple unique items", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = ["a", "b", "c", "d", "e"];
    const result = await node.execute(
      createContext({ options, count: 3, unique: true })
    );

    expect(result.status).toBe("completed");
    expect(Array.isArray(result.outputs?.value)).toBe(true);
    expect((result.outputs?.value as unknown[]).length).toBe(3);

    // Check all items are from options
    for (const item of result.outputs?.value as unknown[]) {
      expect(options).toContain(item);
    }

    // Check uniqueness
    const unique = new Set(result.outputs?.value as unknown[]);
    expect(unique.size).toBe(3);
  });

  it("should allow duplicate selections when unique is false", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = ["x"];
    const result = await node.execute(
      createContext({ options, count: 5, unique: false })
    );

    expect(result.status).toBe("completed");
    expect(Array.isArray(result.outputs?.value)).toBe(true);
    expect((result.outputs?.value as unknown[]).length).toBe(5);
    // All should be "x"
    for (const item of result.outputs?.value as unknown[]) {
      expect(item).toBe("x");
    }
  });

  it("should handle single non-array option", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ options: "only-option" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("only-option");
  });

  it("should handle numeric options", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = [1, 2, 3, 4, 5];
    const result = await node.execute(createContext({ options }));

    expect(result.status).toBe("completed");
    expect(options).toContain(result.outputs?.value);
  });

  it("should handle object options", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = await node.execute(createContext({ options }));

    expect(result.status).toBe("completed");
    expect(options).toContainEqual(result.outputs?.value);
  });

  it("should select all items when count equals array length", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = ["a", "b", "c"];
    const result = await node.execute(
      createContext({ options, count: 3, unique: true })
    );

    expect(result.status).toBe("completed");
    expect(Array.isArray(result.outputs?.value)).toBe(true);
    expect((result.outputs?.value as unknown[]).length).toBe(3);

    // Check all options are included
    const selected = result.outputs?.value as unknown[];
    for (const option of options) {
      expect(selected).toContain(option);
    }
  });

  it("should return error for missing options", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: options");
  });

  it("should return error for empty options array", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(createContext({ options: [] }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("options cannot be empty");
  });

  it("should return error when count exceeds options length with unique=true", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ options: ["a", "b"], count: 5, unique: true })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Cannot select 5 unique items from 2 options"
    );
  });

  it("should return error for invalid count type", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ options: ["a"], count: "invalid" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid count");
  });

  it("should return error for count less than 1", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ options: ["a"], count: 0 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("must be at least 1");
  });

  it("should return error for non-integer count", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ options: ["a"], count: 2.5 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("must be an integer");
  });

  it("should produce different results on repeated calls", async () => {
    const node = new RandomChoiceNode({
      nodeId: "random-choice",
    } as unknown as Node);
    const options = Array.from({ length: 100 }, (_, i) => i);
    const results = await Promise.all([
      node.execute(createContext({ options, count: 10 })),
      node.execute(createContext({ options, count: 10 })),
      node.execute(createContext({ options, count: 10 })),
    ]);

    expect(results[0].status).toBe("completed");
    expect(results[1].status).toBe("completed");
    expect(results[2].status).toBe("completed");

    // Very unlikely all three are identical
    const allSame =
      JSON.stringify(results[0].outputs?.value) ===
        JSON.stringify(results[1].outputs?.value) &&
      JSON.stringify(results[1].outputs?.value) ===
        JSON.stringify(results[2].outputs?.value);
    expect(allSame).toBe(false);
  });
});
