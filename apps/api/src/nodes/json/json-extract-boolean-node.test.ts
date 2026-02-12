import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonExtractBooleanNode } from "./json-extract-boolean-node";

describe("JsonExtractBooleanNode", () => {
  it("should extract boolean value from simple path", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      active: true,
      verified: false,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.active",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract boolean value from nested path", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      user: {
        profile: {
          name: "Jane",
          settings: {
            notifications: true,
            emailVerified: false,
          },
        },
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.user.profile.settings.notifications",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract false boolean value", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      settings: {
        enabled: false,
        debug: true,
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.settings.enabled",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract boolean value from array path", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      flags: [
        { name: "flag1", enabled: true },
        { name: "flag2", enabled: false },
        { name: "flag3", enabled: true },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.flags[1].enabled",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when boolean not found", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
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
        path: "$.active",
        defaultValue: true,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(false);
  });

  it("should return false as default when no default provided", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
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
        path: "$.active",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(false);
  });

  it("should find first boolean value in array", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [
        { type: "number", value: 42 },
        { type: "boolean", value: true },
        { type: "string", value: "hello" },
        { type: "boolean", value: false },
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
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle null JSON input", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: null,
        path: "$.active",
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
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: "not an object",
        path: "$.active",
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
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = { active: true };
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
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = { active: true };
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

  it("should not find boolean when path points to non-boolean value", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
      active: "yes", // string instead of boolean
      settings: { theme: "dark" },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.active",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle complex nested structure", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {
      data: {
        users: [
          {
            id: 1,
            profile: {
              name: "Alice",
              settings: {
                emailVerified: true,
                notifications: false,
                twoFactorEnabled: true,
              },
            },
          },
          {
            id: 2,
            profile: {
              name: "Bob",
              settings: {
                emailVerified: false,
                notifications: true,
                twoFactorEnabled: false,
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
        path: "$.data.users[0].profile.settings.emailVerified",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(true);
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle empty object", async () => {
    const nodeId = "json-extract-boolean";
    const node = new JsonExtractBooleanNode({
      nodeId,
    } as unknown as Node);

    const json = {};
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.active",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(false);
    expect(result.outputs?.found).toBe(false);
  });
});
