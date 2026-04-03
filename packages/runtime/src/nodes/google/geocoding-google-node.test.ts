import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { GeocodingGoogleNode } from "./geocoding-google-node";

describe("GeocodingGoogleNode", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    env: Record<string, string> = {}
  ): NodeContext =>
    ({
      nodeId: "geocoding-google",
      inputs,
      organizationId: "test-org",
      env,
    }) as unknown as NodeContext;

  it("should return error when GOOGLE_API_KEY is missing", async () => {
    const node = new GeocodingGoogleNode({
      nodeId: "geocoding-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ address: "Mountain View, CA" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("GOOGLE_API_KEY");
  });

  it("should return error when neither address nor coordinates provided", async () => {
    const node = new GeocodingGoogleNode({
      nodeId: "geocoding-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({}, { GOOGLE_API_KEY: "test-key" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("address or latitude/longitude");
  });
});
