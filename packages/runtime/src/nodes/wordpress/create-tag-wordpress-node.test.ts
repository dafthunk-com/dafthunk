import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { CreateTagWordPressNode } from "./create-tag-wordpress-node";

describe("CreateTagWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "create-tag-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new CreateTagWordPressNode({
      nodeId: "create-tag-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ name: "x" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("returns an error when name is missing", async () => {
    const node = new CreateTagWordPressNode({
      nodeId: "create-tag-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ integrationId: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Tag name is required");
  });
});
