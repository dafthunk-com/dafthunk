import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { AirQualityGoogleNode } from "./air-quality-google-node";

describe("AirQualityGoogleNode", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    env: Record<string, string> = {}
  ): NodeContext =>
    ({
      nodeId: "air-quality-google",
      inputs,
      organizationId: "test-org",
      env,
    }) as unknown as NodeContext;

  it("should return error when GOOGLE_API_KEY is missing", async () => {
    const node = new AirQualityGoogleNode({
      nodeId: "air-quality-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ latitude: 48.8, longitude: 2.3 })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("GOOGLE_API_KEY");
  });

  it("should return error for missing coordinates", async () => {
    const node = new AirQualityGoogleNode({
      nodeId: "air-quality-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({}, { GOOGLE_API_KEY: "test-key" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Latitude and longitude");
  });
});
