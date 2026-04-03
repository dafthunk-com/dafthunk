import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { WeatherGoogleNode } from "./weather-google-node";

describe("WeatherGoogleNode", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    env: Record<string, string> = {}
  ): NodeContext =>
    ({
      nodeId: "weather-google",
      inputs,
      organizationId: "test-org",
      env,
    }) as unknown as NodeContext;

  it("should return error when GOOGLE_API_KEY is missing", async () => {
    const node = new WeatherGoogleNode({
      nodeId: "weather-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ latitude: 48.8, longitude: 2.3 })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("GOOGLE_API_KEY");
  });

  it("should return error for missing coordinates", async () => {
    const node = new WeatherGoogleNode({
      nodeId: "weather-google",
    } as unknown as Node);
    const result = await node.execute(
      createContext({}, { GOOGLE_API_KEY: "test-key" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Latitude and longitude");
  });
});
