import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { GetSiteWordPressNode } from "./get-site-wordpress-node";

describe("GetSiteWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "get-site-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new GetSiteWordPressNode({
      nodeId: "get-site-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });
});
