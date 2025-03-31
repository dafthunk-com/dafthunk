import { describe, it, expect, beforeAll } from "vitest";
import { onRequest } from "./types";
import { NodeRegistry } from "../src/lib/server/runtime/registries";

// Define the type for our node type responses
interface NodeType {
  id: string;
  name: string;
  description: string;
  inputs: unknown;
  outputs: unknown;
}

describe("types function", () => {
  it("should return node types from NodeRegistry", async () => {
    const response = await onRequest({} as any);
    const data = (await response.json()) as NodeType[];

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((nodeType) => nodeType.id === "addition")).toBe(true);
  });
});
