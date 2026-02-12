import { Node } from "@dafthunk/types";
import { validate as uuidValidate, version as uuidVersion } from "uuid";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { RandomUuidNode } from "./random-uuid-node";

describe("RandomUuidNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "random-uuid",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should generate a valid v4 UUID by default", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.uuid).toBeDefined();
    expect(typeof result.outputs?.uuid).toBe("string");
    expect(uuidValidate(result.outputs?.uuid as string)).toBe(true);
    expect(uuidVersion(result.outputs?.uuid as string)).toBe(4);
  });

  it("should generate a valid v1 UUID", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({ version: 1 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.uuid).toBeDefined();
    expect(uuidValidate(result.outputs?.uuid as string)).toBe(true);
    expect(uuidVersion(result.outputs?.uuid as string)).toBe(1);
  });

  it("should generate a valid v4 UUID", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({ version: 4 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.uuid).toBeDefined();
    expect(uuidValidate(result.outputs?.uuid as string)).toBe(true);
    expect(uuidVersion(result.outputs?.uuid as string)).toBe(4);
  });

  it("should generate a valid v7 UUID", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({ version: 7 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.uuid).toBeDefined();
    expect(uuidValidate(result.outputs?.uuid as string)).toBe(true);
    expect(uuidVersion(result.outputs?.uuid as string)).toBe(7);
  });

  it("should generate different UUIDs on each call", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result1 = await node.execute(createContext({}));
    const result2 = await node.execute(createContext({}));

    expect(result1.status).toBe("completed");
    expect(result2.status).toBe("completed");
    expect(result1.outputs?.uuid).not.toBe(result2.outputs?.uuid);
  });

  it("should return error for invalid version type", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({ version: "invalid" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid version");
  });

  it("should return error for unsupported version", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({ version: 3 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid UUID version");
  });

  it("should return error for negative version", async () => {
    const node = new RandomUuidNode({
      nodeId: "random-uuid",
    } as unknown as Node);
    const result = await node.execute(createContext({ version: -1 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid UUID version");
  });
});
