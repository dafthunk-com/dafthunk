import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonBodyNode } from "./json-body-node";

describe("JsonBodyNode", () => {
  it("should extract JSON object from request body", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = { name: "test", value: 42, active: true };
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual(testData);
  });

  it("should extract JSON array from request body", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = [1, 2, 3, "test", { key: "value" }];
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(testData);
  });

  it("should extract nested JSON object", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = {
      user: {
        id: 123,
        name: "John Doe",
        email: "john@example.com",
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      metadata: {
        created: "2023-01-01T00:00:00Z",
        version: "1.0.0",
      },
    };
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(testData);
  });

  it("should handle primitive values", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = "simple string";
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(testData);
  });

  it("should handle null value", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeNull();
  });

  it("should handle required parameter when body is missing", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("JSON body is required");
  });

  it("should handle optional parameter when body is missing", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: false }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeUndefined();
  });

  it("should handle missing HTTP request when required", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("HTTP request information is required");
  });

  it("should handle missing HTTP request when optional", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: false }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeUndefined();
  });

  it("should handle complex JSON structure", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = {
      products: [
        {
          id: 1,
          name: "Product A",
          price: 29.99,
          tags: ["electronics", "gadget"],
          specifications: {
            weight: "0.5kg",
            dimensions: {
              length: 10,
              width: 5,
              height: 2,
            },
          },
        },
        {
          id: 2,
          name: "Product B",
          price: 49.99,
          tags: ["home", "kitchen"],
          specifications: {
            weight: "1.2kg",
            dimensions: {
              length: 15,
              width: 8,
              height: 3,
            },
          },
        },
      ],
      order: {
        id: "ORD-12345",
        customer: {
          name: "Jane Smith",
          email: "jane@example.com",
          address: {
            street: "123 Main St",
            city: "Anytown",
            state: "CA",
            zip: "12345",
          },
        },
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        total: 109.97,
        status: "pending",
      },
    };
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(testData);
  });

  it("should handle empty object", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: {},
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual({});
  });

  it("should handle empty array", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: [],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual([]);
  });

  it("should handle boolean values", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = {
      enabled: true,
      visible: false,
      settings: {
        autoSave: true,
        notifications: false,
      },
    };
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(testData);
  });

  it("should handle number values", async () => {
    const nodeId = "body-json";
    const node = new JsonBodyNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const testData = {
      integer: 42,
      float: 3.14159,
      negative: -10,
      zero: 0,
    };
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        body: testData,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(testData);
  });
});
