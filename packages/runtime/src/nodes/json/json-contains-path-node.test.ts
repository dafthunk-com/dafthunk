import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonContainsPathNode } from "./json-contains-path-node";

describe("JsonContainsPathNode", () => {
  const nodeId = "json-contains-path";
  const node = new JsonContainsPathNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const json = {
    user: { name: "ada", tags: ["math", "code"] },
    count: 0,
    empty: null,
  };

  it("finds a top-level path", async () => {
    const result = await node.execute(createContext({ json, path: "$.count" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(true);
    expect(result.outputs?.isValid).toBe(true);
  });

  it("finds a nested path", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.user.name" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(true);
  });

  it("finds an array element by index", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.user.tags[1]" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(true);
  });

  it("reports an out-of-range index as missing", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.user.tags[9]" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(false);
  });

  it("treats a key holding null as present", async () => {
    const result = await node.execute(createContext({ json, path: "$.empty" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(true);
  });

  it("reports a missing path", async () => {
    const result = await node.execute(
      createContext({ json, path: "$.user.email" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(false);
  });

  it("marks null input as invalid", async () => {
    const result = await node.execute(
      createContext({ json: null, path: "$.a" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(false);
    expect(result.outputs?.isValid).toBe(false);
  });

  it("returns false when no path is given", async () => {
    const result = await node.execute(createContext({ json }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.containsPath).toBe(false);
    expect(result.outputs?.isValid).toBe(true);
  });
});
