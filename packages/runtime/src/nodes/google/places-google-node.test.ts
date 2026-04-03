import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { PlacesGoogleNode } from "./places-google-node";

describe("PlacesGoogleNode", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    env: Record<string, string> = {}
  ): NodeContext =>
    ({
      nodeId: "places-google",
      inputs,
      organizationId: "test-org",
      env,
    }) as unknown as NodeContext;

  it("should return error when GOOGLE_API_KEY is missing", async () => {
    const node = new PlacesGoogleNode({
      nodeId: "places-google",
    } as unknown as Node);
    const result = await node.execute(createContext({ query: "restaurants" }));
    expect(result.status).toBe("error");
    expect(result.error).toContain("GOOGLE_API_KEY");
  });

  it("should return error for missing query", async () => {
    const node = new PlacesGoogleNode({
      nodeId: "places-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({}, { GOOGLE_API_KEY: "test-key" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Search query is required");
  });
});
