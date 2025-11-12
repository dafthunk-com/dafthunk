import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { RandomStringNode } from "./random-string-node";

describe("RandomStringNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "random-string",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should generate an alphanumeric string of specified length", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(createContext({ length: 10 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeDefined();
    expect(typeof result.outputs?.value).toBe("string");
    expect((result.outputs?.value as string).length).toBe(10);
    expect(result.outputs?.value).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("should generate an alphabetic string", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 15, charset: "alpha" })
    );

    expect(result.status).toBe("completed");
    expect((result.outputs?.value as string).length).toBe(15);
    expect(result.outputs?.value).toMatch(/^[A-Za-z]+$/);
  });

  it("should generate a numeric string", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 8, charset: "numeric" })
    );

    expect(result.status).toBe("completed");
    expect((result.outputs?.value as string).length).toBe(8);
    expect(result.outputs?.value).toMatch(/^[0-9]+$/);
  });

  it("should generate a hexadecimal string", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 16, charset: "hex" })
    );

    expect(result.status).toBe("completed");
    expect((result.outputs?.value as string).length).toBe(16);
    expect(result.outputs?.value).toMatch(/^[0-9a-f]+$/);
  });

  it("should generate a base64 string", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 20, charset: "base64" })
    );

    expect(result.status).toBe("completed");
    expect((result.outputs?.value as string).length).toBe(20);
    expect(result.outputs?.value).toMatch(/^[A-Za-z0-9+/]+$/);
  });

  it("should generate a string with custom charset", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 10, charset: "custom", customCharset: "ABC" })
    );

    expect(result.status).toBe("completed");
    expect((result.outputs?.value as string).length).toBe(10);
    expect(result.outputs?.value).toMatch(/^[ABC]+$/);
  });

  it("should generate an empty string when length is 0", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(createContext({ length: 0 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("");
  });

  it("should generate different strings on each call", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result1 = await node.execute(createContext({ length: 20 }));
    const result2 = await node.execute(createContext({ length: 20 }));

    expect(result1.status).toBe("completed");
    expect(result2.status).toBe("completed");
    // Very unlikely to be the same
    expect(result1.outputs?.value).not.toBe(result2.outputs?.value);
  });

  it("should return error for missing length", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: length");
  });

  it("should return error for invalid length type", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(createContext({ length: "invalid" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid length");
  });

  it("should return error for negative length", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(createContext({ length: -5 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("must be non-negative");
  });

  it("should return error for non-integer length", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(createContext({ length: 5.5 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("must be an integer");
  });

  it("should return error for invalid charset", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 10, charset: "invalid" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid charset");
  });

  it("should return error for custom charset without customCharset", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 10, charset: "custom" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("customCharset is required");
  });

  it("should return error for empty customCharset", async () => {
    const node = new RandomStringNode({
      nodeId: "random-string",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ length: 10, charset: "custom", customCharset: "" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("customCharset cannot be empty");
  });
});
