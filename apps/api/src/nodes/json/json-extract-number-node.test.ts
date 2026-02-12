import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonExtractNumberNode } from "./json-extract-number-node";

describe("JsonExtractNumberNode", () => {
  it("should extract number value from simple path", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
      score: 95.5,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.age",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(30);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract float value from nested path", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      user: {
        profile: {
          name: "Jane",
          stats: {
            height: 165.5,
            weight: 60.2,
          },
        },
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.user.profile.stats.height",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(165.5);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract zero value", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      settings: {
        count: 0,
        limit: 100,
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.settings.count",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract negative number", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      balance: -150.75,
      temperature: -5,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.balance",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(-150.75);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract number value from array path", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      scores: [
        { name: "Alice", score: 85 },
        { name: "Bob", score: 92.5 },
        { name: "Charlie", score: 78 },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.scores[1].score",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(92.5);
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when number not found", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.score",
        defaultValue: 100,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(100);
    expect(result.outputs?.found).toBe(false);
  });

  it("should return 0 as default when no default provided", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.score",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(false);
  });

  it("should find first number value in array", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [
        { type: "string", value: "hello" },
        { type: "number", value: 42 },
        { type: "boolean", value: true },
        { type: "number", value: 3.14 },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.items[*].value",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(42);
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle null JSON input", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: null,
        path: "$.age",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle invalid JSON input", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: "not an object",
        path: "$.age",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle missing path", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = { age: 30 };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle null path", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = { age: 30 };
    const context = {
      nodeId,
      inputs: {
        json,
        path: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should not find number when path points to non-number value", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: "thirty", // string instead of number
      active: true,
      settings: { theme: "dark" },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.age",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle NaN values", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      values: [1, 2, NaN, 4, 5],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.values[2]",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle complex nested structure", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      data: {
        users: [
          {
            id: 1,
            profile: {
              name: "Alice",
              stats: {
                posts: 42,
                followers: 1234,
                engagement: 95.7,
              },
            },
          },
          {
            id: 2,
            profile: {
              name: "Bob",
              stats: {
                posts: 15,
                followers: 567,
                engagement: 87.3,
              },
            },
          },
        ],
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.data.users[0].profile.stats.engagement",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(95.7);
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle empty object", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {};
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.age",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle Infinity values", async () => {
    const nodeId = "json-extract-number";
    const node = new JsonExtractNumberNode({
      nodeId,
    } as unknown as Node);

    const json = {
      values: [1, 2, Infinity, 4, 5],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.values[2]",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(Infinity);
    expect(result.outputs?.found).toBe(true);
  });
});
