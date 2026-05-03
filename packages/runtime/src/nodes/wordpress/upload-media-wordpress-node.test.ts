import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { UploadMediaWordPressNode } from "./upload-media-wordpress-node";

describe("UploadMediaWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "upload-media-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new UploadMediaWordPressNode({
      nodeId: "upload-media-wordpress",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: { data: new Uint8Array([1]), mimeType: "image/png" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("returns an error when image is missing", async () => {
    const node = new UploadMediaWordPressNode({
      nodeId: "upload-media-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ integrationId: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image is required");
  });
});
